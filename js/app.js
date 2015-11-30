"use strict";

angular.module("EventFinderApp", ['ngSanitize', 'ui.router'])
    .config(function($stateProvider){
        $stateProvider
            //home page
            .state('home', {
                url: '/', //"root" directory
                templateUrl: 'partials/home.html',
                controller: "HomeCtrl"
            })
    })

    //returns the user to the homepage if an invalid route is given
    .config(function($urlRouterProvider) {
        $urlRouterProvider.otherwise('/');
    })

    .controller("HomeCtrl", ["$scope", function($scope) {

        var map = L.map('map-container').setView([37.50, -97.00], 4);
        L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
            maxZoom: 15,
            minZoom: 3,
            id: "mapbox.light",
            accessToken: "pk.eyJ1IjoiZGhhbjIwNiIsImEiOiJjaWZzeWE4c2QwZDAzdHRseWRkMXR2b2Y5In0.Gbh1YncNoaD5W4zylMfNTw"
        }).addTo(map);

    }])
