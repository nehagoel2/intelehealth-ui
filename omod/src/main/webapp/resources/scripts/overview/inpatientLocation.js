angular.module('inpatientLocation', ['resources', 'locationService', 'ui.bootstrap'])
    .controller('InpatientLocationCtrl', ['$scope', '$http', '$timeout', 'LocationService', 'WardResource',
        function ($scope, $http, $timeout, LocationService, WardResource) {

            var allLocations = [];
            var allBeds = [];
            var config = {};
            var bedTagUuid = 'c8bb459c-5e7d-11e4-9305-df58197607bd';
            $scope.bedAssignments = [];
            var firstLoad = true;

            $scope.wardTypes = [
                {
                    display: 'Suspect',
                    uuid: '2e78a6e0-582a-11e4-af12-660e112eb3f5'
                },
                {
                    display: 'Confirmed',
                    uuid: '18789832-582a-11e4-af12-660e112eb3f5'
                },
                {
                    display: 'Recovery',
                    uuid: '16250bf4-5e71-11e4-9305-df58197607bd'
                }
            ];
            $scope.bedsInWard = null;
            $scope.occupied = 'Occupied';

            LocationService.getLocations({v: "default", limit: 100}).then(function (result) {
                if (result.length == 100) {
                    return LocationService.getLocations({v: "default", limit: 100, startIndex: 100}).then(function (more) {
                        allLocations = _.union(result, more);
                    });
                }
                else{
                    allLocations = result;
                }
            }).then(function(){
                allBeds = getAllBeds();
                $scope.$watch('changeToWard', function (changeToWard) {
                    if (typeof changeToWard === 'undefined') {
                        $scope.changeToBed = null;
                    }
                    bedsForWard($scope.changeToWard);
                });
            });

            $scope.init = function (setConfig) {
                config = setConfig;
                if (typeof config.currentWard !== 'undefined') {
                    for (x = 0; x < $scope.wardTypes.length; x++) {
                        if ($scope.strContains(config.currentWard.display, $scope.wardTypes[x].display)) {
                            $scope.changeToWardType = $scope.wardTypes[x];
                            break;
                        }
                    }
                    $scope.changeToWard = config.currentWard;

                } else {
                    $scope.changeToWardType = null;
                    $scope.changeToWard = null;
                }

                $scope.changeToBed = typeof config.currentBed !== 'undefined' ? config.currentBed : null;
            };

            $scope.strContains = function (string, subString) {
                return string.indexOf(subString) != -1;
            };

            $scope.makingChange = true;

            $scope.$watch('changeToWardType', function (changeToWardType) {
                if (typeof changeToWardType === 'undefined' ) {
                    $scope.changeToWard = null;
                    $scope.changeToBed = null;
                }
                if(firstLoad){
                    firstLoad = false;
                }
                else{
                    $scope.changeToWard = null;
                }
            });

            function getAllBeds() {
                var beds = _.filter(allLocations, function (item) {
                    return item.parentLocation
                        && _.some(item.tags, function (tag) {
                            return tag.uuid === bedTagUuid;
                        });
                });
                beds.sort(function (a, b) {
                    var nameA = parseInt(a.display.substr(a.display.indexOf('#') + 1));
                    var nameB = parseInt(b.display.substr(b.display.indexOf('#') + 1));
                    return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
                });
                return beds;
            }

            function updateBedsInCurrentWard(bedAssignments) {
                var beds = _.filter(allBeds, function (bed) {
                    return bed.parentLocation.uuid == $scope.changeToWard.uuid
                });
                for (y = 0; y < beds.length; y++) {
                    if (isOccupied(beds[y], bedAssignments)) {
                        if (!$scope.strContains(beds[y].display, " Occupied")) {
                            beds[y].display += " Occupied";
                        }
                    }
                }
                $scope.bedsInWard = beds;
            }

            function isOccupied(bed, bedAssignments) {
                for (var z = 0; z < bedAssignments.length; z++) {
                    if (bedAssignments[z].bed.uuid == bed.uuid) {
                        return true;
                    }
                }

                return false;
            }

            $scope.doTransfer = function () {
                if (isOccupied($scope.changeToBed, $scope.bedAssignments)) {
                    alert("Selected bed is already occupied");
                    return;
                }

                var url = emr.fragmentActionLink("ebolaexample", "overview/inpatientLocation", "transfer", {
                    patient: config.patientUuid,
                    location: $scope.changeToBed ? $scope.changeToBed.uuid : $scope.changeToWard.uuid
                });
                $http.post(url).success(function (data) {
                    location.href = emr.pageLink('ebolaexample', 'ebolaOverview', { patient: config.patientUuid });
                });
            };

            $scope.wardsOfType = function (wardType) {
                if (!wardType) {
                    return [];
                }
                return _.filter(allLocations, function (item) {
                    return _.some(item.tags, function (tag) {
                        return tag.uuid === wardType.uuid;
                    });
                });
            };

            function bedsForWard(ward) {
                if (!ward) {
                    $scope.bedsInWard = null;
                    return [];
                }
                WardResource.get({uuid: ward.uuid}).$promise.then(function (bedAssignments) {
                    updateBedsInCurrentWard(bedAssignments.bedAssignments);
                    $scope.bedAssignments = bedAssignments.bedAssignments;

                });
            }

            $scope.changeLocationPatient = function () {
                location.href = emr.pageLink('ebolaexample', 'changeInPatientLocation', { patientUuid: config.patientUuid });
            };

            $scope.cancel = function() {
                location.href = emr.pageLink('ebolaexample', 'ebolaOverview', { patient: config.patientUuid });
            }
        }]);

