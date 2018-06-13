'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var e2e = require('@openveo/test').e2e;
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var MEDIA_PLATFORM_TYPES = process.requirePublish('app/server/providers/mediaPlatforms/types.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var PropertyHelper = process.requirePublish('tests/client/e2eTests/helpers/PropertyHelper.js');
var CategoryHelper = process.requirePublish('tests/client/e2eTests/helpers/CategoryHelper.js');
var TableAssert = e2e.asserts.TableAssert;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Media page', function() {
  var page;
  var addedProperties;
  var addedCategories;
  var tableAssert;
  var categoryHelper;
  var propertyHelper;
  var mediaHelper;

  before(function() {
    var coreApi = process.api.getCoreApi();
    var videoProvider = new VideoProvider(coreApi.getDatabase());
    var propertyProvider = new PropertyProvider(coreApi.getDatabase());
    categoryHelper = new CategoryHelper(coreApi.taxonomyProvider);
    propertyHelper = new PropertyHelper(propertyProvider);
    mediaHelper = new MediaHelper(videoProvider);
    page = new MediaPage(videoProvider);
    tableAssert = new TableAssert(page, mediaHelper);
  });

  // Add categories and custom properties before launching tests
  before(function() {
    var properties = [];
    var categoryNames = ['Test medias category 0', 'Test medias category 1'];
    var propertyNames = ['Test medias property'];
    page.logAsAdmin();
    page.load().then(function() {

      categoryHelper.createCategories(categoryNames).then(function(addedLines) {
        addedCategories = addedLines;
      });

      for (var i = 0; i < propertyNames.length; i++) {
        properties.push({
          name: propertyNames[i] + ' text',
          description: propertyNames[i] + ' text description',
          type: PropertyProvider.TYPES.TEXT
        });
        properties.push({
          name: propertyNames[i] + ' list',
          description: propertyNames[i] + ' list description',
          type: PropertyProvider.TYPES.LIST,
          values: ['tag1', 'tag2']
        });
        properties.push({
          name: propertyNames[i] + ' boolean',
          description: propertyNames[i] + ' boolean description',
          type: PropertyProvider.TYPES.BOOLEAN
        });
      }

      propertyHelper.addEntities(properties).then(function(addedLines) {
        addedProperties = addedLines;
      });

      page.refresh().then(function() {
        page.setProperties(addedProperties);
        page.setCategories(addedCategories);
        mediaHelper.setProperties(addedProperties);
        mediaHelper.setCategories(addedCategories);
      });

    });
  });

  // Remove all categories and custom properties when done
  after(function() {
    page.logout();

    // Remove categories added for tests
    categoryHelper.removeAllEntities();

    // Remove properties added for tests
    propertyHelper.removeEntities(addedProperties);

  });

  // Remove all videos after each tests then reload the page
  afterEach(function() {
    mediaHelper.removeAllEntities();
    page.refresh();
  });

  /**
   * Checks that actions correspond to expected actions.
   *
   * @param {Number} state The state to test
   * @param {Array} actions The list of actions to test
   * @param {Array} expected The list of expected actions
   */
  function checkActions(state, actions, expectedActions) {
    var j = 0;

    for (var i = 0; i < actions.length; i++) {
      var action = actions[i];
      if (expectedActions.indexOf(action) >= 0)
        j++;
    }

    assert.equal(j, expectedActions.length, 'Actions for state ' + state + ' are incorrect');
  }

  /**
   * Checks state.
   *
   * @param {Number} state The state to test
   * @param {Array} expectedActions Expected actions for a line
   * @param {Array} expectedGlobalActions Expected global actions
   * @return {Promise} Promise resolving when checked
   */
  function checkStateActions(state, expectedActions, expectedGlobalActions) {
    return browser.waitForAngular().then(function() {
      var lines;
      var linesToAdd = [
        {
          id: '0',
          state: state,
          title: 'Test state'
        }
      ];

      mediaHelper.addEntities(linesToAdd).then(function(addedLines) {
        lines = addedLines;
        page.refresh();
      });

      page.getLineActions(linesToAdd[0].title).then(function(actions) {
        checkActions(state, actions, expectedActions);
      });

      page.getGlobalActions().then(function(actions) {
        checkActions(state, actions, expectedGlobalActions);
      });

      return browser.waitForAngular().then(function() {
        mediaHelper.removeEntities(lines);
        return page.refresh();
      });
    });
  }

  /**
   * Gets properties as key / value object.
   *
   * @return {Object} The custom properties with values initialized to null
   */
  function getProperties() {
    var properties = page.getProperties();
    var propertiesById = {};

    for (var i = 0; i < properties.length; i++)
      propertiesById[properties[i].id] = null;

    return propertiesById;
  }

  it('should display page title', function() {
    assert.eventually.ok(page.pageTitleElement.isPresent());
  });

  it('should display page description', function() {
    assert.eventually.ok(page.pageDescriptionElement.isPresent());
  });

  it('should be able to remove a media', function() {
    var linesToAdd = [
      {
        id: '0',
        state: STATES.PUBLISHED,
        title: 'Test remove',
        properties: getProperties()
      }
    ];

    mediaHelper.addEntities(linesToAdd);
    page.refresh();
    assert.isFulfilled(page.getLine(linesToAdd[0].title));
    page.removeLine(linesToAdd[0].title);
    assert.isRejected(page.getLine(linesToAdd[0].title));
  });

  it('should not display buttons to change the number of items per page if lines lower than 6', function() {
    page.getTotalLines().then(function(totalLines) {
      if (totalLines < 6)
        assert.eventually.equal(page.itemsPerPageLinkElements.count(), 0);
    });
  });

  it('should be able to edit a media', function() {
    var categories = page.getCategories();
    var properties = page.getProperties();
    var name = 'test edition';
    var newName = 'test edition renamed';
    var newDate = new Date('2017/12/16');
    var newDescription = 'test edition renamed description';
    var newCategory = categories[0].id;
    var propertiesById = {};

    // Set custom properties values
    for (var i = 0; i < properties.length; i++) {
      if (properties[i].type === PropertyProvider.TYPES.TEXT)
        propertiesById[properties[i].id] = 'test edition ' + properties[i].name + ' value';
      else if (properties[i].type === PropertyProvider.TYPES.LIST)
        propertiesById[properties[i].id] = properties[i].values[0];
      else if (properties[i].type === PropertyProvider.TYPES.BOOLEAN)
        propertiesById[properties[i].id] = true;
    }

    var linesToAdd = [
      {
        id: '0',
        date: new Date('2017/12/15').getTime(),
        state: STATES.PUBLISHED,
        title: name,
        properties: getProperties(),
        type: MEDIA_PLATFORM_TYPES.LOCAL
      }
    ];

    // Create line
    mediaHelper.addEntities(linesToAdd);
    page.refresh();

    // Edit property with new values
    page.editMedia(name, {
      name: newName,
      date: newDate,
      description: newDescription,
      category: newCategory,
      properties: propertiesById
    });

    browser.executeScript(
      'var $injector = angular.injector([\'ng\']);' +
      'var $filter = $injector.get(\'$filter\');' +
      'return $filter(\'date\')(' + newDate.getTime() + ', \'medium\');'
    ).then(function(mediumDate) {
      assert.isFulfilled(page.getLine(newName));
      assert.eventually.equal(page.getLineFieldText(newName, 'date'), mediumDate);
      assert.eventually.equal(page.getLineFieldText(newName, 'description'), newDescription);
      assert.eventually.equal(page.getLineFieldText(newName, 'category'), categories[0].title);
    });

  });

  it('should be able to cancel when removing a media', function() {
    return tableAssert.checkCancelRemove();
  });

  it('should be able to sort medias by name', function() {
    return tableAssert.checkSort(page.translations.PUBLISH.MEDIAS.NAME_COLUMN);
  });

  it('should be able to sort medias by date', function() {
    return tableAssert.checkSort(page.translations.PUBLISH.MEDIAS.DATE_COLUMN);
  });

  it('should be able to sort medias by category', function() {
    return tableAssert.checkSort(page.translations.PUBLISH.MEDIAS.CATEGORY_COLUMN);
  });

  it('should be able to sort medias by status', function() {
    return tableAssert.checkSort(page.translations.PUBLISH.MEDIAS.STATUS_COLUMN);
  });

  it('should have buttons to change the number of items per page', function() {
    return tableAssert.checkItemsPerPage();
  });

  it('should be able to remove several lines simultaneously', function() {
    return tableAssert.checkMassiveRemove();
  });

  it('should be paginated', function() {
    return tableAssert.checkPagination();
  });

  it('should be able to select lines', function() {
    return tableAssert.checkLinesSelection('title');
  });

  it('should be able to see, publish, access chapters or remove a media in ready state', function() {
    checkStateActions(STATES.READY, [
      page.translations.CORE.UI.VIEW,
      page.translations.PUBLISH.MEDIAS.PUBLISH,
      page.translations.PUBLISH.MEDIAS.CHAPTER_EDIT,
      page.translations.CORE.UI.REMOVE
    ], [
      page.translations.PUBLISH.MEDIAS.PUBLISH,
      page.translations.CORE.UI.REMOVE
    ]);
  });

  it('should be able to see, share, access chapters or remove a media in published state', function() {
    checkStateActions(STATES.PUBLISHED, [
      page.translations.CORE.UI.VIEW,
      page.translations.PUBLISH.MEDIAS.UNPUBLISH,
      page.translations.PUBLISH.MEDIAS.CHAPTER_EDIT,
      page.translations.CORE.UI.REMOVE
    ], [
      page.translations.PUBLISH.MEDIAS.UNPUBLISH,
      page.translations.CORE.UI.REMOVE
    ]);
  });

  it('should be able to remove or upload medias in waiting for upload state', function() {
    checkStateActions(STATES.WAITING_FOR_UPLOAD, [
      page.translations.PUBLISH.MEDIAS.UPLOAD_VIMEO,
      page.translations.PUBLISH.MEDIAS.UPLOAD_YOUTUBE,
      page.translations.CORE.UI.REMOVE
    ], [
      page.translations.CORE.UI.REMOVE
    ]);
  });

  it('should be able to remove or retry a media in error state', function() {
    checkStateActions(STATES.ERROR, [
      page.translations.PUBLISH.MEDIAS.RETRY,
      page.translations.CORE.UI.REMOVE
    ], [
      page.translations.CORE.UI.REMOVE
    ]);
  });

  it('should not be able to perform any action if media is in a pending state', function() {
    checkStateActions(STATES.PENDING, [], []);
    checkStateActions(STATES.COPYING, [], []);
    checkStateActions(STATES.EXTRACTING, [], []);
    checkStateActions(STATES.VALIDATING, [], []);
    checkStateActions(STATES.PREPARING, [], []);
    checkStateActions(STATES.UPLOADING, [], []);
    checkStateActions(STATES.SYNCHRONIZING, [], []);
    checkStateActions(STATES.SAVING_TIMECODES, [], []);
    checkStateActions(STATES.COPYING_IMAGES, [], []);
    checkStateActions(STATES.GENERATE_THUMB, [], []);
    checkStateActions(STATES.GET_METADATA, [], []);
  });

  describe('Search', function() {

    it('should be able to search by exact name', function() {
      var expectedValues;
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search 0',
          properties: getProperties()
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Test search 1',
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      // Build search query
      var search = {query: linesToAdd[0].title};

      // Get all line values
      page.getLineValues(page.translations.PUBLISH.MEDIAS.NAME_COLUMN).then(function(values) {

        // Predict values
        expectedValues = values.filter(function(element) {
          return element === search.query;
        });

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.PUBLISH.MEDIAS.NAME_COLUMN);
      });
    });

    it('should not be able to search by partial name', function() {
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search 0',
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      // Build search query
      var search = {query: linesToAdd[0].title.slice(0, 2)};

      page.search(search);
      assert.isRejected(page.getLineValues(page.translations.PUBLISH.MEDIAS.NAME_COLUMN));
    });

    it('should be able to search by exact description', function() {
      var expectedValues = [];
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search 0',
          description: 'Test search description 0',
          properties: getProperties()
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Test search 1',
          description: 'Test search description 1',
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      // Build search query
      var search = {query: linesToAdd[0].description};

      // Get all line details
      page.getAllLineDetails().then(function(datas) {

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return data.fields.description === search.query;
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.PUBLISH.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search medias on specific day', function() {
      var queryDate;
      var expectedValues = [];
      var expectedDate = new Date('2016/01/20').getTime();
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search 0',
          date: new Date('2016/01/20 16:20:42').getTime(),
          properties: getProperties()
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Test search 1',
          date: new Date('2015/01/20').getTime(),
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      browser.executeScript(
        'var $injector = angular.injector([\'ng\']);' +
        'var $filter = $injector.get(\'$filter\');' +
        'return $filter(\'date\')(' + expectedDate + ', \'shortDate\');'
      ).then(function(date) {
        queryDate = date;
        return mediaHelper.getEntities();
      }).then(function(medias) {
        var fromDate = new Date(expectedDate);
        var endDate = new Date(expectedDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setMilliseconds(endDate.getMilliseconds() - 1);

        // Predict values
        for (var i = 0; i < medias.length; i++) {
          if (medias[i].date >= fromDate && medias[i].date <= endDate)
            expectedValues.push(medias[i].title);
        }

      }).then(function() {
        return tableAssert.checkSearch(
          {from: queryDate, to: queryDate},
          expectedValues,
          page.translations.PUBLISH.MEDIAS.NAME_COLUMN
        );
      });
    });

    it('should be able to search medias between two dates', function() {
      var queryDates;
      var expectedValues = [];
      var expectedStartDate = new Date('2015/01/01').getTime();
      var expectedEndDate = new Date('2016/01/01').getTime();
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search 0',
          date: new Date('2016/01/20').getTime(),
          properties: getProperties()
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Test search 1',
          date: new Date('2015/01/20').getTime(),
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      browser.executeScript(
        'var $injector = angular.injector([\'ng\']);' +
        'var $filter = $injector.get(\'$filter\');' +
        'return {' +
        'from: $filter(\'date\')(' + expectedStartDate + ', \'shortDate\'),' +
        'to: $filter(\'date\')(' + expectedEndDate + ', \'shortDate\')' +
        '};'
      ).then(function(dates) {
        queryDates = dates;
        return mediaHelper.getEntities();
      }).then(function(medias) {
        var fromDate = new Date(expectedStartDate);
        var toDate = new Date(expectedEndDate);

        // Predict values
        for (var i = 0; i < medias.length; i++) {
          if (medias[i].date >= fromDate && medias[i].date <= toDate)
            expectedValues.push(medias[i].title);
        }

      }).then(function() {
        return tableAssert.checkSearch(
          {from: queryDates.from, to: queryDates.to},
          expectedValues,
          page.translations.PUBLISH.MEDIAS.NAME_COLUMN
        );
      });
    });

    it('should be able to search by category', function() {
      var expectedValues = [];
      var categories = page.getCategories();
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search 0',
          properties: getProperties(),
          category: categories[0].id
        },
        {
          id: '1',
          state: STATES.PUBLISHED,
          title: 'Test search 1',
          properties: getProperties(),
          category: categories[1].id
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      // Build search query
      var search = {category: categories[0].id};

      // Get all line details
      page.getAllLineDetails().then(function(datas) {
        var regexp = new RegExp(categories[0].title);

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return regexp.test(data.fields.category);
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.PUBLISH.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by name in case insensitive', function() {
      var expectedValues;
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search',
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      var search = {query: linesToAdd[0].title.toUpperCase()};

      // Get all line values
      page.getLineValues(page.translations.PUBLISH.MEDIAS.NAME_COLUMN).then(function(values) {
        var regexp = new RegExp(search.query, 'i');

        // Predict values
        expectedValues = values.filter(function(element) {
          return regexp.test(element);
        });

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.PUBLISH.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by description in case insensitive', function() {
      var expectedValues = [];
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search',
          description: 'Test search description',
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      var search = {query: linesToAdd[0].description.toUpperCase()};

      // Get all line values before search
      return page.getAllLineDetails().then(function(datas) {
        var regexp = new RegExp(search.query, 'i');

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return regexp.test(data.fields.description);
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.PUBLISH.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search in name and description', function() {
      var expectedValues = [];
      var linesToAdd = [
        {
          id: '42',
          state: STATES.PUBLISHED,
          title: 'first name',
          description: 'first name description',
          properties: getProperties()
        },
        {
          id: '43',
          state: STATES.PUBLISHED,
          title: 'second name',
          description: 'second description after first',
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      var search = {query: 'first'};

      // Get all line values before search
      return page.getAllLineDetails().then(function(datas) {
        var regexp = new RegExp('\\b' + search.query + '\\b');

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return regexp.test(data.fields.description) || regexp.test(data.fields.title);
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.PUBLISH.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to clear search', function() {
      var linesToAdd = [
        {
          id: '0',
          state: STATES.PUBLISHED,
          title: 'Test search',
          properties: getProperties()
        }
      ];

      // Add lines
      mediaHelper.addEntities(linesToAdd);
      page.refresh();

      var search = {query: linesToAdd[0].title.toUpperCase()};
      page.search(search);
      page.clearSearch();
      assert.isFulfilled(page.getLineValues(page.translations.PUBLISH.MEDIAS.NAME_COLUMN));
    });

  });

});
