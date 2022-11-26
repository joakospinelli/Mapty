'use strict';

const url = 'https://api.open-meteo.com/v1/forecast?daily=temperature_2m_max,precipitation_sum&current_weather=true&timezone=auto&'
// https://api.open-meteo.com/v1/forecast?daily=temperature_2m_max&current_weather=true&timezone=auto&latitude=-34.93&longitude=-57.97

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputTipo = document.querySelector('.form__input--tipo');
const inputNombre = document.querySelector('.form__input--nombre');
const inputInfo = document.querySelector('.form__input--info');
const inputHorario = document.querySelector('.form__input--horario');

class Workout {

    fechaCreacion = new Date();
    id = this.fechaCreacion.getTime();

    constructor(tipo, nombre, info, coords, horario = null) {
        this.tipo = tipo;
        this.nombre = nombre;
        this.info = info;
        this.coords = coords;
        this.horario = horario;
    }

}

class App {

    #map;
    #mapEvent;
    #list = [];

    constructor(){
        this._getPosition();
        this._getLocalStorage();
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        form.addEventListener('submit', this._newWorkout.bind(this));
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#list))
    }

    _getIcon(workout) {
        switch (workout.tipo){
            case 'estudio': return '📚';
            case 'casa': return '🏠';
            case 'compras': return '💰';
            case 'otro': return '🎯';
            default: return '';
        }
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;

        this.#map = L.map('map').setView([latitude, longitude], 13);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
    
        this.#map.on('click', this._showForm.bind(this));

        this.#list.forEach(i => this._renderWorkout(i));
        this.#list.forEach(i => this._addMarker(i));
    }

    _getPosition() {
        // La primer función se ejecuta si la ubicación se encuentra exitosamente; la segunda función se ejecuta en caso fallido
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(){
            alert('Ubicación no encontrada')
        })
    }

    _showForm(e) {
        form.classList.remove('hidden');
        inputNombre.focus();
        this.#mapEvent = e;
    }

    _getLocalStorage() {
        const items = localStorage.getItem('workouts');

        if (!items) return;

        this.#list = JSON.parse(items);
    }

    async _renderWorkout(workout) {

        const weather = await this._getWeather(workout);

        let html = `
        <li class="workout workout--${ workout.tipo }" data-id="${ workout.id }">
            <h2 class="workout__title">${ workout.nombre }</h2>
            <div class="workout__details">
                <span class="workout__value">${ this._getIcon(workout) } ${ workout.horario ? workout.horario : '' }</span>
            </div>
            <div class="workout__details">
                <span class="workout__value">${ workout.info }</span>
            </div>
            <div class="workout__details">
                <span class="workout__value weather weather__${ weather >= 20 ? 'heat' : 'cold' }">${ weather } °C</span>
            </div>
            <br>
            <a class="workout__delete">Delete</a>
        </li>
        `
        
        form.insertAdjacentHTML('afterend', html);
    }

    async _getWeather(workout) {

        const res = await fetch(url + `latitude=${workout.coords[0]}&longitude=${workout.coords[1]}`);
        const data = await res.json();

        return data.current_weather.temperature;
    }

    _addMarker(workout) {
        L.marker(workout.coords).addTo(this.#map).bindPopup(
            L.popup({
                // en este objeto le podemos agregar opciones de estilo, clases, etc
                autoClose: false,
                closeOnClick: false,
                className: `${workout.tipo}-popup`
            })
        ).setPopupContent(workout.nombre)
        .openPopup();
    }

    _newWorkout(e) {
        e.preventDefault();
        
        const tipo = inputTipo.value;
        const nombre = inputNombre.value;
        const info = inputInfo.value;
        const horario = inputHorario.value;
        const { lat, lng } = this.#mapEvent.latlng;

        if (horario && (horario.length > 5 || (horario.length === 5 && horario[2] !== ':')))
            return alert('Ingrese un formato de hora válido (HH:MM)');
        
        const workout = new Workout(tipo, nombre, info, [ lat, lng ], horario);

        this.#list.push(workout);
        this._addMarker(workout);
        this._renderWorkout(workout);
        this._setLocalStorage();

        inputTipo.value = inputNombre.value = inputInfo.value = inputHorario.value = '';
        form.classList.add('hidden');
    }

    _deleteWorkout(workout) {

        if (!confirm(`Seguro que desea eliminar el workout "${workout.nombre}"?`)) return;

        const id = workout.id;

        const deleted = this.#list.find(w => w.id === id);

        this.#list.splice(this.#list.indexOf(deleted), 1);

        this._setLocalStorage();
        location.reload();
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        let workout = this.#list.find(i => i.id === +workoutEl.dataset.id);

        if (e.target.classList.contains('workout__delete')) {
            this._deleteWorkout(workout);
            return;
        }

        const selected = this.#list.find(work => work.id === +workout.id);

        this.#map.setView(selected.coords, 13, {
            animate: true,
            pan: { duration: 1 }
        });
    }

}

const app = new App();