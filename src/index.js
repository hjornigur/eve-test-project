'use strict';

import 'setimmediate';

Vue.use(Vuetify);
Vue.filter('toISK', function (value) {
    if (typeof value !== "number") {
        return value;
    }
    var formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'ISK',
        minimumFractionDigits: 0
    });
    return formatter.format(value);
})

// Aweful `wait` function from StackOverflow, but it works 😬
function wait(ms) {
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
        end = new Date().getTime();
    }
}

const app = new Vue({
    el: '#app',
    vuetify: new Vuetify(),
    data: {
        auth: {},

        settings: {},

        SwaggerClient: null,

        table: {
            options: {
                sortBy: [],
                sortDesc: [true]
            },
            headers: [
                { text: "Icon", value: "image", sortable: false },
                { text: "Name", value: "name", sortable: false },
                { text: "", value: "type_id", sortable: false },
            ],
            items: [],
            selected: [],
            fill: false,
            showLabels: true,
            rating: {
                halfIncrements: true,
            }
        },

        dialog: false,

        loading: false,
        loadingProgress: undefined,
        loadingColor: 'blue',
        indeterminate: false,

        error: false,
        errorMessage: '',
        info: false,
        infoMessage: '',

        redirectUrl: '',
    },
    methods: {
        apiCall: async function(endpointCategory, endpoint, kwargs, responseKey) {
            let result;
            let timesFailed = 0;
            while (!result && timesFailed < 3) {
                // TODO: Проверять, нужна ли авторизация
                if (kwargs) {
                    // TODO: add structure_id check
                    if (endpoint.includes('character_id'))
                    kwargs.token = this.auth.access_token;
                }

                try {
                    const response = await this.SwaggerClient.apis[endpointCategory][endpoint](kwargs);
                    result = response[responseKey || 'body'];
                }
                catch (error) {
                    this.error = true;
                    this.errorMessage = error;
                    if (error.status == 404) {
                        break;
                    }
                    if (error.status == 403) {
                        await this.refreshToken();
                    }
                    if (error = 'TypeError: Failed to fetch') {
                        wait(5000);
                    }
                    timesFailed++;
                }
            }
            return result;
        },
        refreshToken: async function () {
            console.log('Refreshing token...');
            this.updateAuth(
                (await axios.get(`sso?code=${this.auth.refresh_token}&refresh=true`)).data
            );
            console.log('Token refreshed.')
        },
        updateAuth: function (authData) {
            localStorage.setItem('access_token', authData.access_token);
            localStorage.setItem('refresh_token', authData.refresh_token);
            localStorage.setItem('character_id', authData.decoded_access_token.sub.split(':')[2]);
            this.getAuthFromCache();
        },
        getAuthFromCache: function () {
            this.auth = {
                access_token: localStorage.getItem('access_token'),
                refresh_token: localStorage.getItem('refresh_token'),
                character_id: localStorage.getItem('character_id')
            }
        },
        logout: async function() {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('character_id');
            this.getAuthFromCache();
            this.redirectUrl = (await axios.get('/login-url')).data;
        },

        test: async function() {
            let response = await this.apiCall('Location', 'get_characters_character_id_location', {
                character_id: this.auth.character_id, token: this.auth.access_token
            });
            console.log(response);
            this.info = true;
            this.infoMessage = 'Информация о локации персонажа получена и выведена в консоль'
        },
    },
    beforeCreate: async function () {
        this.$vuetify.theme.dark = true;
        this.SwaggerClient = await new SwaggerClient('https://esi.evetech.net/_latest/swagger.json?datasource=tranquility');
    },
    created: async function() {
        if (window.location.search) {
            this.loading = true;
            this.updateAuth(
                (await axios.get(`/sso${window.location.search}`)).data
            );
            window.location.href = window.location.origin;
        }
        else if (localStorage.getItem('access_token')) {
            console.warn(this.getAuthFromCache)
            this.getAuthFromCache();
        }
        else {
            this.redirectUrl = (await axios.get('/login-url')).data;
        }
    },
    watch: {
        SwaggerClient: async function (newVal) {
            console.log(this.SwaggerClient.apis);
        }
    }
})
