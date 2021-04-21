import 'regenerator-runtime/runtime';
import 'core-js/stable';

('use strict');

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
   date = new Date();
   id = (Date.now() + '').slice(-10); // I take as id the date and convert it into a string, then take the last 10 digits

   constructor(coords, distance, duration) {
      this.coords = coords; // [lat, lng]
      this.distance = distance; // in km
      this.duration = duration; // in min
   }
}

class Running extends Workout {
   type = 'running';

   constructor(coords, distance, duration, cadence) {
      super(coords, distance, duration);
      this.cadence = cadence;
      this.calcPace();
   }

   calcPace() {
      // min/km
      this.pace = this.duration / this.distance;
      return this.pace;
   }
}

class Cycling extends Workout {
   type = 'cycling';

   constructor(coords, distance, duration, elevationGain) {
      super(coords, distance, duration);
      this.elevationGain = elevationGain;
      this.calcSpeed();
   }

   calcSpeed() {
      // km/h
      this.speed = this.distance / (this.duration / 60);
      return this.speed;
   }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

/////////////////////////////////////////////
// Application arhitecture
class App {
   #map;
   #mapEvent;
   #workouts = [];

   constructor() {
      // Get user's position
      this._getPosition();

      // Get data from local storage
      this._getLocalStorage();

      // Attach event handlers
      form.addEventListener('submit', this._newWorkout.bind(this));
      inputType.addEventListener('change', this._toogleElevationField);
      containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
   }

   _getPosition() {
      // navigator.geolocation.getCurrentPosition takes 2 callback functions, one for success and one for failure
      // The first one always gets 1 parameter and we usually call it position
      if (navigator.geolocation)
         navigator.geolocation.getCurrentPosition(
            this._loadMap.bind(this),
            function () {
               alert('Could not get your position');
            }
         );
   }

   _loadMap(position) {
      const { latitude } = position.coords;
      const { longitude } = position.coords;
      console.log(`https://www.google.ro/maps/@${latitude},${longitude}`);

      this.#map = L.map('map').setView([latitude, longitude], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
         attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);

      // Handling clicks on map
      this.#map.on('click', this._showForm.bind(this));

      this.#workouts.forEach((work) => {
         this._renderWorkoutMarker(work);
      });
   }

   _showForm(mapE) {
      this.#mapEvent = mapE;
      form.classList.remove('hidden');
      inputDistance.focus();
   }

   _toogleElevationField() {
      inputElevation
         .closest('.form__row')
         .classList.toggle('form__row--hidden');
      inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
   }

   _newWorkout(e) {
      const validInputs = (...inputs) =>
         inputs.every((inp) => Number.isFinite(inp));
      const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

      e.preventDefault();

      // Get data from form
      const type = inputType.value;
      const distance = +inputDistance.value; // it comes as string so we conver it into a number by adding + in front
      const duration = +inputDuration.value;
      const { lat, lng } = this.#mapEvent.latlng;
      let workout;

      // If activity running, create running object
      if (type === 'running') {
         const cadence = +inputCadence.value;
         // Check if data is valid
         if (
            !validInputs(distance, duration, cadence) ||
            !allPositive(distance, duration, cadence)
         )
            return alert('Inputs have to be positive numbers');

         workout = new Running([lat, lng], distance, duration, cadence);
      }

      // If activity cycling, create cycling object
      if (type === 'cycling') {
         const elevation = +inputElevation.value;
         // Check if data is valid
         if (
            !validInputs(distance, duration, elevation) ||
            !allPositive(distance, duration)
         )
            return alert('Inputs have to be positive numbers');

         workout = new Cycling([lat, lng], distance, duration, elevation);
      }

      // Add new object to workout array
      this.#workouts.push(workout);

      // Render workout on map as marker
      this._renderWorkoutMarker(workout);

      // Render workout on list
      this._renderWorkout(workout);

      // Set local storage to all workouts
      this._setLocalStorage();
   }

   _renderWorkoutMarker(workout) {
      L.marker(workout.coords)
         .addTo(this.#map)
         .bindPopup(
            L.popup({
               maxWidth: 250,
               minWidth: 100,
               autoClose: false,
               closeOnClick: false,
               className: `${workout.type}-popup`,
            })
         )
         .setPopupContent(
            `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${[
               workout.type.split('')[0].toUpperCase(),
               workout.type.split('').slice(1),
            ]
               .flat()
               .join('')} on`
         )
         .openPopup();

      form.reset();
      form.classList.add('hidden');
   }

   _renderWorkout(workout) {
      let wk;

      if (workout.type === 'running') {
         wk = `<li class="workout workout--running" data-id="${workout.id}">
      <h2 class="workout__title">Running on </h2>
      <div class="workout__details">
        <span class="workout__icon">🏃‍♂️</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${Math.round(+workout.pace)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
      } else {
         wk = `<li class="workout workout--cycling" data-id="${workout.id}">
      <h2 class="workout__title">Cycling on </h2>
      <div class="workout__details">
        <span class="workout__icon">🚴‍♀️</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${Math.round(+workout.speed)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;
      }
      form.insertAdjacentHTML('afterend', wk);
   }

   _moveToPopup(e) {
      const workoutEl = e.target.closest('.workout');

      if (!workoutEl) return;

      const workout = this.#workouts.find(
         (work) => work.id === workoutEl.dataset.id
      );

      this.#map.setView(workout.coords, 13, {
         animate: true,
         pan: {
            duration: 1,
         },
      });
   }

   _setLocalStorage() {
      localStorage.setItem('workouts', JSON.stringify(this.#workouts));
   }

   _getLocalStorage() {
      const data = JSON.parse(localStorage.getItem('workouts'));

      if (!data) return;

      this.#workouts = data;

      this.#workouts.forEach((work) => {
         this._renderWorkout(work);
      });
   }

   reset() {
      localStorage.removeItem('workouts');
      location.reload();
   }
}

const app = new App();
