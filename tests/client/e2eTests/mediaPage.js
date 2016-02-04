'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var e2e = require('@openveo/test').e2e;
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var mediaHelper = process.requirePublish('tests/client/e2eTests/helpers/mediaHelper.js');
var propertyHelper = process.requirePublish('tests/client/e2eTests/helpers/propertyHelper.js');
var categoryHelper = process.requirePublish('tests/client/e2eTests/helpers/categoryHelper.js');
var TableAssert = e2e.asserts.TableAssert;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Media page', function() {
  var page;
  var addedProperties;
  var addedCategories;
  var tableAssert;

  // Add categories and custom properties before launching tests
  before(function() {
    var properties = [];
    var categoryNames = ['Test medias category 0', 'Test medias category 1'];
    var propertyNames = ['Test medias property'];
    page = new MediaPage(new VideoModel());
    tableAssert = new TableAssert(page);
    page.logAsAdmin();
    page.load().then(function() {

      categoryHelper.createCategories(categoryNames).then(function(addedLines) {
        addedCategories = addedLines;
      });

      for (var i = 0; i < propertyNames.length; i++) {
        properties.push({
          name: propertyNames[i],
          description: propertyNames[i] + ' description',
          type: page.translations.PROPERTIES.FORM_ADD_TEXT_TYPE
        });
      }

      propertyHelper.createProperties(properties).then(function(addedLines) {
        addedProperties = addedLines;
      });

      page.refresh().then(function() {
        page.setProperties(addedProperties);
        page.setCategories(addedCategories);
      });

    });
  });

  // Remove all categories and custom properties when done
  after(function() {
    page.logout();

    // Remove categories added for tests
    categoryHelper.removeAllCategories();

    // Remove properties added for tests
    propertyHelper.removeProperties(addedProperties);

  });

  // Remove all videos after each tests then reload the page
  afterEach(function() {
    mediaHelper.removeAllMedias();
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

      page.addLinesByPass(linesToAdd).then(function(addedLines) {
        lines = addedLines;
      });

      page.getLineActions(linesToAdd[0].title).then(function(actions) {
        checkActions(state, actions, expectedActions);
      });

      page.getGlobalActions().then(function(actions) {
        checkActions(state, actions, expectedGlobalActions);
      });

      return browser.waitForAngular().then(function() {
        return page.removeLinesByPass(lines);
      });
    });
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
        state: VideoModel.PUBLISHED_STATE,
        title: 'Test remove',
        properties: page.getProperties()
      }
    ];

    page.addLinesByPass(linesToAdd);
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
    var newDescription = 'test edition renamed description';
    var newCategory = categories[0].id;

    for (var property in properties)
      properties[property] = 'test edition ' + property + ' value';

    var linesToAdd = [
      {
        id: '0',
        state: VideoModel.PUBLISHED_STATE,
        title: name,
        properties: page.getProperties()
      }
    ];

    // Create line
    page.addLinesByPass(linesToAdd);

    // Edit property with a new name and new description
    page.editMedia(name, {
      name: newName,
      description: newDescription,
      category: newCategory,
      properties: properties
    });
    assert.isFulfilled(page.getLine(newName));
    assert.eventually.equal(page.getLineFieldText(newName, 'description'), newDescription);
    assert.eventually.equal(page.getLineFieldText(newName, 'category'), categories[0].title);
  });

  it('should be able to cancel when removing a media', function() {
    return tableAssert.checkCancelRemove();
  });

  it('should be able to sort medias by name', function() {
    return tableAssert.checkSort(page.translations.MEDIAS.NAME_COLUMN);
  });

  it('should be able to sort medias by date', function() {
    return tableAssert.checkSort(page.translations.MEDIAS.DATE_COLUMN);
  });

  it('should be able to sort medias by category', function() {
    return tableAssert.checkSort(page.translations.MEDIAS.CATEGORY_COLUMN);
  });

  it('should be able to sort medias by status', function() {
    return tableAssert.checkSort(page.translations.MEDIAS.STATUS_COLUMN);
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

  it('should be able to see, publish, access chapters or remove a media in ready state', function() {
    checkStateActions(VideoModel.READY_STATE, [
      page.translations.UI.VIEW,
      page.translations.MEDIAS.PUBLISH,
      page.translations.MEDIAS.CHAPTER_EDIT,
      page.translations.UI.REMOVE
    ], [
      page.translations.MEDIAS.PUBLISH,
      page.translations.UI.REMOVE
    ]);
  });

  it('should be able to see, share, access chapters or remove a media in published state', function() {
    checkStateActions(VideoModel.PUBLISHED_STATE, [
      page.translations.UI.VIEW,
      page.translations.MEDIAS.UNPUBLISH,
      page.translations.MEDIAS.CHAPTER_EDIT,
      page.translations.UI.REMOVE
    ], [
      page.translations.MEDIAS.UNPUBLISH,
      page.translations.UI.REMOVE
    ]);
  });

  it('should be able to remove or upload medias in waiting for upload state', function() {
    checkStateActions(VideoModel.WAITING_FOR_UPLOAD_STATE, [
      page.translations.MEDIAS.UPLOAD_VIMEO,
      page.translations.MEDIAS.UPLOAD_YOUTUBE,
      page.translations.UI.REMOVE
    ], [
      page.translations.UI.REMOVE
    ]);
  });

  it('should be able to remove or retry a media in error state', function() {
    checkStateActions(VideoModel.ERROR_STATE, [
      page.translations.MEDIAS.RETRY,
      page.translations.UI.REMOVE
    ], [
      page.translations.UI.REMOVE
    ]);
  });

  it('should not be able to perform any action if media is in a pending state', function() {
    checkStateActions(VideoModel.PENDING_STATE, [], []);
    checkStateActions(VideoModel.COPYING_STATE, [], []);
    checkStateActions(VideoModel.EXTRACTING_STATE, [], []);
    checkStateActions(VideoModel.VALIDATING_STATE, [], []);
    checkStateActions(VideoModel.PREPARING_STATE, [], []);
    checkStateActions(VideoModel.UPLOADING_STATE, [], []);
    checkStateActions(VideoModel.CONFIGURING_STATE, [], []);
    checkStateActions(VideoModel.SAVING_TIMECODES_STATE, [], []);
    checkStateActions(VideoModel.COPYING_IMAGES_STATE, [], []);
    checkStateActions(VideoModel.GENERATE_THUMB_STATE, [], []);
    checkStateActions(VideoModel.GET_METADATA_STATE, [], []);
  });

  describe('Search', function() {

    it('should be able to search by exact name', function() {
      var expectedValues;
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 0',
          properties: page.getProperties()
        },
        {
          id: '1',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 1',
          properties: page.getProperties()
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      // Build search query
      var search = {name: linesToAdd[0].title};

      // Get all line values
      page.getLineValues(page.translations.MEDIAS.NAME_COLUMN).then(function(values) {

        // Predict values
        expectedValues = values.filter(function(element) {
          return element === search.name;
        });

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by partial name', function() {
      var expectedValues;
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 0',
          properties: page.getProperties()
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      // Build search query
      var search = {name: linesToAdd[0].title.slice(4, 2)};

      // Get all line values
      page.getLineValues(page.translations.MEDIAS.NAME_COLUMN).then(function(values) {

        // Predict values
        expectedValues = values.filter(function(element) {
          return new RegExp(search.name).test(element);
        });

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by exact description', function() {
      var expectedValues = [];
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 0',
          description: 'Test search description 0',
          properties: page.getProperties()
        },
        {
          id: '1',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 1',
          description: 'Test search description 1',
          properties: page.getProperties()
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      // Build search query
      var search = {description: linesToAdd[0].description};

      // Get all line details
      page.getAllLineDetails().then(function(datas) {

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return data.fields.description === search.description;
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by description', function() {
      var expectedValues = [];
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 0',
          description: 'Test search description 0',
          properties: page.getProperties()
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      // Build search query
      var search = {description: linesToAdd[0].description};

      // Get all line details
      page.getAllLineDetails().then(function(datas) {

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return new RegExp(search.description).test(data.fields.description);
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by date', function() {
      var expectedValues = [];
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 0',
          date: new Date('2016/01/20').getTime(),
          properties: page.getProperties()
        },
        {
          id: '1',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 1',
          date: new Date('2015/01/20').getTime(),
          properties: page.getProperties()
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      // Build search query
      // Be careful dates are displayed in french format
      var search = {date: '20/01/2015'};

      // Get all line details
      page.getAllLineDetails().then(function(datas) {

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return new RegExp(search.date).test(data.cells[2]);
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by category', function() {
      var expectedValues = [];
      var categories = page.getCategories();
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 0',
          properties: page.getProperties(),
          category: categories[0].id
        },
        {
          id: '1',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search 1',
          properties: page.getProperties(),
          category: categories[1].id
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      // Build search query
      var search = {category: categories[0].id};

      // Get all line details
      page.getAllLineDetails().then(function(datas) {

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return new RegExp(categories[0].title).test(data.fields.category);
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by name, description, date and category at the same time', function() {
      var expectedValues = [];
      var categories = page.getCategories();
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search',
          description: 'Test search description',
          date: new Date('2016/01/20').getTime(),
          properties: page.getProperties(),
          category: categories[0].id
        },
        {
          id: '1',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search',
          description: 'Test search description',
          date: new Date('2016/01/20').getTime(),
          properties: page.getProperties(),
          category: categories[1].id
        },
        {
          id: '2',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search',
          description: 'Test search description',
          date: new Date('2015/11/20').getTime(),
          properties: page.getProperties(),
          category: categories[0].id
        },
        {
          id: '3',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search',
          description: 'Different',
          date: new Date('2016/01/20').getTime(),
          properties: page.getProperties(),
          category: categories[0].id
        },
        {
          id: '4',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Different',
          description: 'Test search description',
          date: new Date('2016/01/20').getTime(),
          properties: page.getProperties(),
          category: categories[0].id
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      // Build search query
      var search = {
        name: linesToAdd[0].title,
        description: linesToAdd[0].description,
        date: '20/01/2016',
        category: categories[0].id
      };

      // Get all line details
      page.getAllLineDetails().then(function(datas) {

        // Predict values
        var filteredDatas = datas.filter(function(data) {
          return (search.name === data.cells[1]) &&
            (search.description === data.fields.description) &&
            (search.date === data.cells[2]) &&
            (categories[0].title === data.fields.category);
        });

        for (var i = 0; i < filteredDatas.length; i++)
          expectedValues.push(filteredDatas[i].cells[1]);

      }).then(function() {
        return tableAssert.checkSearch(search, expectedValues, page.translations.MEDIAS.NAME_COLUMN);
      });
    });

    it('should be able to search by name in case sensitive', function() {
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search',
          properties: page.getProperties()
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      var search = {name: linesToAdd[0].title.toUpperCase()};
      page.search(search);
      assert.isRejected(page.getLineValues(page.translations.MEDIAS.NAME_COLUMN));
    });

    it('should be able to search by description in case sensitive', function() {
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search',
          description: 'Test search description',
          properties: page.getProperties()
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      var search = {name: linesToAdd[0].description.toUpperCase()};
      page.search(search);
      assert.isRejected(page.getLineValues(page.translations.MEDIAS.NAME_COLUMN));
    });

    it('should be able to clear search', function() {
      var linesToAdd = [
        {
          id: '0',
          state: VideoModel.PUBLISHED_STATE,
          title: 'Test search',
          properties: page.getProperties()
        }
      ];

      // Add lines
      page.addLinesByPass(linesToAdd);

      var search = {name: linesToAdd[0].title.toUpperCase()};
      page.search(search);
      page.clearSearch();
      assert.isFulfilled(page.getLineValues(page.translations.MEDIAS.NAME_COLUMN));
    });

  });

});
