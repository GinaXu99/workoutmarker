'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10); //random generate id using 10 digits of date
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; //[lat, lng]
        this.distance = distance; //in km
        this.duration = duration; //in min 
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    /** When the browser load, data from local storage for workouts will lose its prototype (inhertence is lost)
     * (happens during JSON convertion), so it no longer has its prototype click() and this will cause isue
     * when trying to click if browser loads
     * 
     * To fix: can create new objects and loop the data being loaded but thats out of scope
     * so commented out this method
     */
    click() {
        console.log('workout clicked');
        this.clicks++;
    }
}

class Running extends Workout {
    constructor(coords, distance, duration, cadence, type = 'running') {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.type = type;
        this.calPace();
        this._setDescription();
    }

    calPace() {
        this.pace = this.duration / this.distance; //min/km
        return this.pace;
    }
}

class Cycling extends Workout {
    constructor(coords, distance, duration, elevationGain, type = 'cycling') {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.type = type;
        this.calSpeed();
        this._setDescription();
    }

    calSpeed() {
        this.speed = this.distance / (this.duration / 60); //km/h
        return this.speed;
    }
}

class App {
    /**private instance properties */
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        //1. get user position 
        this._getPosition();

        //2. load user data from local storage when app starts 
        this._getLocalStorage();

        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField); //no need to bind as no use cases 
        //event delegation for mouseclick to locate marker
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            console.log(navigator.geolocation);
            navigator.geolocation.getCurrentPosition
                (this._loadMap.bind(this),
                    function () {  //bind(this) so it will bind to current object
                        alert('Could not get your location');
                    });
        };
    };

    _loadMap(position) {
        alert('Got your location');
        console.log(position);
        const { latitude } = position.coords
        const { longitude } = position.coords;

        console.log(position.coords);
        console.log(latitude, longitude);
        console.log(`https://www.google.com/maps/?q=${latitude},${longitude}`);

        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        //handelling clicks on map
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout => {

            //this will be issue when #map is not loaded ascyn so this method should be when map is not empty thus inside _loadmap method
            this._renderWorkoutMarker(workout);
        })

    };

    _showForm(mapE) {
        this.#mapEvent = mapE;

        //1. load the page once the user clicks the map
        form.classList.remove('hidden');
        //2 focus the cursor
        inputDistance.focus();
    }

    _hideInputform() {
        //1. empty inputs 
        inputDistance.value
            = inputDuration.value
            = inputCadence.value
            = inputElevation.value = '';

        //2. add hidden class
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row')
            .classList.toggle('form__row--hidden')
        inputCadence.closest('.form__row')
            .classList.toggle('form__row--hidden')
    }

    _newWorkout(e) {
        //small helper functions 
        const validInput = (...inputs) =>
            inputs.every(input => Number.isFinite(input));
        const allPositive = (...inputs) =>
            inputs.every(input => input > 0);

        e.preventDefault();

        //1. get data 
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        //2. check if data is valid
        if (type === 'running') {
            const cadence = +inputCadence.value;
            if (
                !validInput(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            )
                alert('Inputs need to be postivie numbers');

            //3. create new object and store in array
            workout = new Running([lat, lng], distance, duration, cadence);
            this.#workouts.push(workout);
        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            if (
                !validInput(distance, duration, elevation)
                || !allPositive(distance, duration)
            )
                alert('Inputs need to be postivie numbers');
            workout = new Cycling([lat, lng], distance, duration, elevation);
            this.#workouts.push(workout);
        }
        console.log(this.#workouts);

        //4. render workout on map as marker 
        this._renderWorkoutMarker(workout);

        //5.render workout list 
        this._renderWorkout(workout);

        //6. hide the form when user is input 
        this._hideInputform();

        //7. set local storage for all workouts
        this._setLocalStorage();
    };

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    minWidth: 100,
                    maxWidth: 200,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`
                }))
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} 
            ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
            `;

        if (workout.type === 'running')
            html += `          
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `;
        if (workout.type === 'cycling')
            html += `          
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `;

        //form and html are like sibilings so insert after form
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        //no matter where user click, find the closet parent which is .workout <li> element
        //then use the data-id to locate particular workout in the array 
        const workoutEl = e.target.closest('.workout');
        console.log(workoutEl);

        //guard check
        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id ===
            workoutEl.dataset.id);
        console.log(workout);

        //once lcoate id then use Leaflet method
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
        //using the public interface
        //workout.click();
    }

    _setLocalStorage() {
        //localStorage is API from browser like navigator
        //save to string
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
        //once the data is stored and then load it when the app starts - _getLocalStorage()
    }

    _getLocalStorage() {
        //use key and value to retrieve the workout 
        //retrive as object 
        const data = JSON.parse(localStorage.getItem('workouts'));
        console.log(data);

        if (!data) return;
        this.#workouts = data;

        this.#workouts.forEach(workout => {
            this._renderWorkout(workout);
            //this will be issue when #map is not loaded ascyn so this method should be when map is not empty thus inside _loadmap method
            // this._renderWorkoutMarker(workout); 
        })
    }

    //remove data from local storage - try from console
    //app.reset();
    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

}

/**Create instance of App so methods in constructor will all get run  */
const app = new App();
