
var jelvixApp = angular.module("jelvixApp", ['ngRoute', 'ui.bootstrap'])
.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $locationProvider.html5Mode({  // убрать #
        enabled: true,
        requiredBase: false
    });
    $routeProvider
        .when('/', { templateUrl: "/views/users.html" })
        .when('/users', { templateUrl: "/views/users.html" })
        .when('/posts', { templateUrl: "/views/posts.html" })
        .when('/comments', { templateUrl: "/views/comments.html" })
        // .when('/', { templateUrl: "/jelvix.local/www/views/users.html" })
        // .when('/users', { templateUrl: "/jelvix.local/www/views/users.html" })
        // .when('/posts', { templateUrl: "/jelvix.local/www/views/posts.html" })
        // .when('/comments', { templateUrl: "/jelvix.local/www/views/comments.html" })
        .otherwise({ redirectTo: '/' });
}])
.run(['$rootScope', '$templateCache', function($rootScope, $templateCache) {
    $rootScope.$on('$routeChangeStart', function(event, next, current) {
        if (typeof(current) !== 'undefined') $templateCache.remove(current.templateUrl);
    });
}])
.controller("jelvixCtrl", ['$scope', '$http', '$filter', '$location', 'globalEdit', function ($scope, $http,  $filter, $location, globalEdit) {

    console.log('jelvix works');
    // текущее представление
    $scope.currentView = 'users';
    $scope.order = {
        users: '-name',
        posts: 'name',
        comments: 'name'
    };
    $scope.itemsToShow = {
        users: [],
        posts: [],
        comments: []
    };
    $scope.totalItems = {
        users: 0,
        posts: 0,
        comments: 0
    };
    $scope.currentPage = {
        users: 1,
        posts: 1,
        comments: 1
    };
    $scope.limitValue = {
        users: 5,
        posts: 5,
        comments: 5
    };
    $scope.parentObj = {
        posts: '',
        comments: ''
    }
    $scope.selectedItem = {
        users: {},
        posts: {}
    };
    $scope.limitRange = [5, 10, 20];  // возможные варианты лимита


    refreshData = function () {
        var root = 'https://jsonplaceholder.typicode.com';

        $http.get(root + '/users')
            .success(function(data){
                globalEdit.setLocalData('users', data);
                $scope.itemsToShow['users'] = globalEdit.getShowItems('users', $scope.currentPage['users']);
                $scope.changedLimit('users', $scope.limitValue['users']);
            });

        $http.get(root + '/posts')
            .success(function(data){
                globalEdit.setLocalData('posts', data);
                $scope.itemsToShow['posts'] = globalEdit.getShowItems('posts', $scope.currentPage['posts']);
            });

        $http.get(root + '/comments')
            .success(function(data){
                globalEdit.setLocalData('comments', data);
                $scope.itemsToShow['comments'] = globalEdit.getShowItems('comments', $scope.currentPage['comments']);
            });
    };
    refreshData();


    $scope.today = $filter("date")(Date.now(), 'dd.MM.yyyy');
    console.log('date now-',Date.now());

    rebuildContent = function (state) {
        $scope.itemsToShow[state] = globalEdit.getShowItems(state, $scope.currentPage[state]);
    };

    $scope.changedLimit = function (state, newLimit) {
        if (newLimit) globalEdit.doItemPerPage(state, newLimit);
        // установить общее количество записей для пагинации
        $scope.totalItems[state] = globalEdit.getTotalItemsNum(state);
        // сколько записей на страницу
        $scope.iPerPage = globalEdit.doItemPerPage(state);
        // вернуть номер страницы текущего представления
        $scope.currentPage[state] = globalEdit.doCurrentPage(state);
        // вернуть материнский объект
        if (state != 'users') $scope.parentObj[state] = globalEdit.getLocalItem(state);
        // получить записи текущей страницы
        rebuildContent(state);
    };

    $scope.changeOrder = function (state, order) {
        var currOrder = globalEdit.doOrder(state);
        if (currOrder === order) order = order.replace('-', '');
        globalEdit.doOrder(state, order);
        rebuildContent(state);
    };

    // вытянуть номер страницы, куда нажали в пагинации
    $scope.pageChange = function (state, page) {        // запомнить страницу
        globalEdit.doCurrentPage(state, page);
        rebuildContent(state);
    };

    // сменить представление users / posts / comments
    $scope.changeView = function (state) {
        $scope.currentView = state;
        // $location.path("/"+state);  // при смене вида менять Url
        $location.path(state);
        $scope.changedLimit(state);
    };


    // выделить цветом выбранный Item
    $scope.target;
    getClosestTd = function (t) {
        return res = (t.tagName != 'td' && t.tagName != 'TD') ? getClosestTd(t.parentNode) : t;
    };
    $scope.selectItem = function (row, event, state) {
        $scope.target = getClosestTd(event.target);
        angular.element($scope.target).addClass("bg-info");
        $scope.selectedItem[state] = row;
        globalEdit.updShowFilter(row, state);
    };
    $scope.$watch("target", function (newVal, oldVal) {
        if(newVal !== oldVal && newVal) angular.element(oldVal).removeClass("bg-info");
    });

}])
.filter("filterItems", function () {
    return function (item, state, filterDeps, filterCrit) {
        if (state == 'posts') var parentEv = 'users';
        if (state == 'comments') var parentEv = 'posts';
        var crit = filterCrit[state];
        var arr = [] ;
        for (var i = item.length - 1; i >= 0; i--) {
            if (item[i][crit] == filterDeps[parentEv]) {
                arr.push(item[i]);
            }
        }
        return arr;
    };
});



jelvixApp.factory('globalEdit',['$filter', function ($filter) {
    var
        data = {
            users: [],
            posts: [],
            comments: []
        },
        itemsToShow = {
            users: [],
            posts: [],
            comments: []
        },
        order = {
            users: '-name',
            posts: 'name',
            comments: 'name'
        },
        iPerPage = {
            users: 5,
            posts: 5,
            comments: 5
        },
        currentPage = {
            users: 1,
            posts: 1,
            comments: 1
        },
        filterDeps = {
            users: 1,
            posts: 1,
        },
        filterCrit = {
            posts: 'userId',
            comments: 'postId'
        };


    return {
        setLocalData: function (state, newData) {
            data[state] = newData;
            // console.log('recive newData - ', newData);
        },
        updShowFilter: function (currItem, state) {
            filterDeps[state] = currItem.id;       // сохранить id выбранного элемента
        },
        getLocalItem: function (state) {
            if (state == 'posts')  var parentEv = 'users';
            if (state == 'comments') var parentEv = 'posts';

            for (var i = data[parentEv].length - 1; i >= 0; i--) {
                if (data[parentEv][i].id == filterDeps[parentEv])  return data[parentEv][i];
            };
            return false;
        },
        // определить список записей к выводу
        getShowItems: function (state, currNum) {    // num - номер страницы
            var num = angular.isUndefined(currNum) ? currentPage[state] : --currNum;
            var first = iPerPage[state] * num;
            var last = first + iPerPage[state];
            itemsToShow[state] = (state == 'users') ? data[state] : $filter("filterItems")(data[state], state, filterDeps, filterCrit);
            // order - по чём сортируем список
            var items = $filter("orderBy")(itemsToShow[state], order[state]).slice(first, last);
            return items;
        },
        getTotalItemsNum: function (state) {
            return itemsToShow[state].length;
        },
        doOrder: function (state, newOrder) {
            if (angular.isUndefined(newOrder)) return order[state];
            order[state] = newOrder;
            return false;
        },
        doItemPerPage: function (state, page) {
            if (angular.isUndefined(page)) return iPerPage[state];
            iPerPage[state] = page;
            return false;
        },
        doCurrentPage: function (state, page) {
            if (angular.isUndefined(page)) return currentPage[state];
            currentPage[state] = page;
            return 1;
        }
    }
}]);
