'use strict';

var path = require('path');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var e2e = require('@openveo/test').e2e;
var EditorPage = process.requirePublish('tests/client/e2eTests/pages/EditorPage.js');
var MediaPage = process.requirePublish('tests/client/e2eTests/pages/MediaPage.js');
var MediaHelper = process.requirePublish('tests/client/e2eTests/helpers/MediaHelper.js');
var VideoModel = process.requirePublish('app/server/models/VideoModel.js');
var VideoProvider = process.requirePublish('app/server/providers/VideoProvider.js');
var PropertyProvider = process.requirePublish('app/server/providers/PropertyProvider.js');
var STATES = process.requirePublish('app/server/packages/states.js');
var browserExt = e2e.browser;

// Load assertion library
var assert = chai.assert;
chai.use(chaiAsPromised);

describe('Editor page', function() {
  var page;
  var mediaId = 'test-editor-page';
  var mediaFilePath = path.join(process.rootPublish, 'tests/client/e2eTests/packages');
  var mediaFileName = 'blank.mp4';
  var mediaFileDuration = 610000;
  var medias;
  var mediaHelper;

  // Create a media content
  before(function() {
    var coreApi = process.api.getCoreApi();
    var videoProvider = new VideoProvider(coreApi.getDatabase());
    var propertyProvider = new PropertyProvider(coreApi.getDatabase());
    var videoModel = new VideoModel(null, videoProvider, propertyProvider);
    var mediaPage = new MediaPage(videoModel);
    page = new EditorPage(mediaId);
    mediaHelper = new MediaHelper(videoModel);

    mediaPage.logAsAdmin();
    mediaPage.load();

    mediaHelper.createMedia(mediaId, mediaFilePath, mediaFileName, STATES.PUBLISHED).then(
      function(mediasAdded) {
        medias = mediasAdded;
        page.logAsAdmin();
        return page.load();
      }
    );
  });

  // Remove media content
  after(function() {
    mediaHelper.removeEntities(medias);
    page.logout();
  });

  // Clear all cut and chapters before each test then reload page
  afterEach(function() {
    mediaHelper.clearChapters(mediaId);
    page.refresh();
  });

  /**
   * Converts percent of the media into time format hh:mm:ss.
   *
   * This is relative to mediaFileDuration.
   *
   * @param {Number} percent Percent of the media (from 0 to 1)
   * @return {String} The time corresponding to the percent of the media in format hh:mm:ss
   */
  function convertPercentToTime(percent) {
    var ms = percent * mediaFileDuration;
    var hours = Math.floor(ms / (1000 * 3600));
    var minutes = Math.floor(((ms / 1000) - hours * 3600) / 60);
    var seconds = Math.floor((ms / 1000) - (hours * 60 + minutes) * 60);
    var pad = function(value) {
      return ('0' + value).slice(-2);
    };

    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
  }

  /**
   * Checks that a chapter is as expected.
   *
   * @param {Object} expectedChapter The expected chapter information
   * @return {Promise} Promise resolving when the chapter has been ckecked
   */
  function checkChapter(expectedChapter) {
    return browser.waitForAngular().then(function() {
      var promises = [];

      // Get both time and title header indexes to avoid hard coding it
      promises.push(page.getTableHeaderIndex(page.translations.PUBLISH.EDITOR.HEAD_TIME));
      promises.push(page.getTableHeaderIndex(page.translations.PUBLISH.EDITOR.HEAD_TITLE));
      promises.push(page.getLineDetails(expectedChapter.title));

      return protractor.promise.all(promises).then(function(results) {
        var timeHeaderIndex = results[0];
        var titleHeaderIndex = results[1];
        var chapter = results[2];

        // Check chapter's cells and fields (in edition form)
        assert.equal(chapter.cells[timeHeaderIndex], expectedChapter.time);
        assert.equal(chapter.cells[titleHeaderIndex], expectedChapter.title);
        assert.equal(chapter.fields.time, expectedChapter.time);
        assert.equal(chapter.fields.title, expectedChapter.title);
        assert.equal(chapter.fields.description, '<p>' + expectedChapter.description + '</p>');
        assert.eventually.ok(page.isChapterOnTimeBar(expectedChapter.title));

        return page.unselectLine(expectedChapter.title);
      });

    });
  }

  /**
   * Checks that a cut is as expected.
   *
   * @param {String} expectedTime The expected cut time in format hh:mm:ss
   * @param {Boolean} isBegin true to check the begin cut, false to check the end cut
   * @return {Promise} Promise resolving when cut has been ckecked
   */
  function checkCut(expectedTime, isBegin) {
    return browser.waitForAngular().then(function() {
      var promises = [];
      var cutTitle = isBegin ? page.translations.CORE.UI.BEGIN : page.translations.CORE.UI.END;

      // Get both time and title header indexes to avoid hard coding it
      promises.push(page.getTableHeaderIndex(page.translations.PUBLISH.EDITOR.HEAD_TIME));
      promises.push(page.getTableHeaderIndex(page.translations.PUBLISH.EDITOR.HEAD_TITLE));
      promises.push(page.getLineDetails(cutTitle, 'cut'));

      return protractor.promise.all(promises).then(function(results) {
        var timeHeaderIndex = results[0];
        var titleHeaderIndex = results[1];
        var cut = results[2];

        // Check cut's cells and fields (in edition form)
        assert.equal(cut.cells[timeHeaderIndex], expectedTime);
        assert.equal(cut.cells[titleHeaderIndex], cutTitle);
        assert.equal(cut.fields.time, expectedTime);
        assert.equal(cut.fields.title, cutTitle);
        assert.eventually.ok(page.isCutOnTimeBar(isBegin));

        return page.unselectLine(cutTitle);
      });
    });
  }

  it('should display page description', function() {
    assert.eventually.ok(page.pageDescriptionElement.isPresent());
  });

  it('should display a button to go back', function() {
    assert.eventually.ok(page.backButtonElement.isPresent());
  });

  it('should be able to add / remove a chapter', function() {
    var chapterToAdd = {
      time: '00:10:00',
      title: 'Test add',
      description: 'Test add description'
    };

    // Add chapter
    page.addChapter(chapterToAdd);

    // Check chapter
    checkChapter(chapterToAdd);

    // Remove chapter
    page.removeChapter(chapterToAdd.title);

  });

  it('should be able to cancel when adding a chapter', function() {
    var chapterToAdd = {
      time: '00:10:00',
      title: 'Test add',
      description: 'Test add description'
    };

    // Add and cancel chapter
    page.addChapter(chapterToAdd, true);

    assert.isRejected(page.getLine(chapterToAdd.title));
  });

  it('should be able to edit a chapter', function() {
    var chapterToAdd = {
      time: '00:10:00',
      title: 'Test edit',
      description: 'Test edit description'
    };
    var expectedChapter = JSON.parse(JSON.stringify(chapterToAdd));

    // Add chapter
    page.addChapter(chapterToAdd);

    // Check chapter
    checkChapter(chapterToAdd);

    // Edit chapter
    expectedChapter.title = 'Test edit different';
    expectedChapter.time = '00:05:00';
    expectedChapter.description = 'Test description different';
    page.editChapter(chapterToAdd.title, expectedChapter);

    // Check chapter
    checkChapter(expectedChapter);
  });

  it('should be able to cancel when editing a chapter', function() {
    var chapterToAdd = {
      time: '00:10:00',
      title: 'Test edit',
      description: 'Test edit description'
    };
    var expectedChapter = JSON.parse(JSON.stringify(chapterToAdd));

    // Add chapter
    page.addChapter(chapterToAdd);

    // Check chapter
    checkChapter(chapterToAdd);

    // Edit chapter
    expectedChapter.title = 'Test edit different';
    expectedChapter.time = '00:05:00';
    expectedChapter.description = 'Test description different';
    page.editChapter(chapterToAdd.title, expectedChapter, true);

    // Check chapter
    checkChapter(chapterToAdd);

  });

  it('should be able to edit chapter time by moving its pointer on the time bar', function() {
    var chapterToAdd = {
      time: '00:00:00',
      title: 'Test edit',
      description: 'Test edit description'
    };
    var expectedChapter = JSON.parse(JSON.stringify(chapterToAdd));

    // Add chapter
    page.addChapter(chapterToAdd);

    // Check chapter
    checkChapter(chapterToAdd);

    // Edit chapter
    expectedChapter.time = '00:05:05';
    page.moveChapter(chapterToAdd.title, 305000);

    // Check chapter
    checkChapter(expectedChapter);

  });

  it('should be able to cut the beginning of the media', function() {
    page.addCut(61000, true);
    assert.isFulfilled(page.getLine(page.translations.CORE.UI.BEGIN));
    page.removeCut(true);
  });

  it('should be able to cut the end of the media', function() {
    page.addCut(488000, false);
    assert.isFulfilled(page.getLine(page.translations.CORE.UI.END));
    page.removeCut(false);
  });

  it('should be able to restore begin cut at its last position', function() {

    // Add and remove begin cut
    page.addCut(61000, true);
    page.removeCut(true);

    // Add begin cut without moving it
    browserExt.click(page.beginCutButtonElement);

    // Check cut
    checkCut(convertPercentToTime(0.1), true);

  });

  it('should be able to restore end cut at its last position', function() {

    // Add and remove end cut
    page.addCut(488000, false);
    page.removeCut(false);

    // Add end cut without moving it
    browserExt.click(page.endCutButtonElement);

    // Check cut
    checkCut(convertPercentToTime(0.8), false);

  });

  it('should be able to edit begin cut', function() {

    // Add begin cut
    page.addCut(61000, true);

    // Edit cut
    page.editCut('00:05:05', true);

    // Check cut
    checkCut('00:05:05', true);

  });

  it('should be able to edit end cut', function() {

    // Add end cut
    page.addCut(488000, false);

    // Edit cut
    page.editCut('00:08:00', false);

    // Check cut
    checkCut('00:08:00', false);

  });

  it('should be able to cancel begin cut edition', function() {

    // Add begin cut
    page.addCut(61000, true);

    // Edit cut
    page.editCut('00:05:05', true, true);

    // Check cut
    checkCut(convertPercentToTime(0.1), true);

  });

  it('should be able to cancel end cut edition', function() {

    // Add end cut
    page.addCut(61000, false);

    // Edit cut
    page.editCut('00:05:05', false, true);

    // Check cut
    checkCut(convertPercentToTime(0.1), false);

  });

  it('should not be able to add a begin cut after the end cut', function() {

    // Add end cut
    page.addCut(305000, false);

    // Add begin cut
    page.addCut(488000, true);

    // Begin cut should live, not the end cut
    assert.isFulfilled(page.getLine(page.translations.CORE.UI.BEGIN));
    assert.isRejected(page.getLine(page.translations.CORE.UI.END));

  });

  it('should not be able to add a end cut before the beginning cut', function() {

    // Add begin cut
    page.addCut(305000, true);

    // Add end cut
    page.addCut(122000, false);

    // Begin cut should live, not the end cut
    assert.isFulfilled(page.getLine(page.translations.CORE.UI.BEGIN));
    assert.isRejected(page.getLine(page.translations.CORE.UI.END));

  });

  it('should be able to zoom in / out the time line', function() {

    // By default zoom in must be enabled and zoom out disabled
    assert.eventually.ok(page.zoomInButtonElement.isEnabled());
    assert.eventually.notOk(page.zoomOutButtonElement.isEnabled());

    // Zoom in
    page.zoom(true);

    // Zoom in must be disabled and zoom out enabled
    assert.eventually.ok(page.zoomOutButtonElement.isEnabled());
    assert.eventually.notOk(page.zoomInButtonElement.isEnabled());

    // Zoom out
    page.zoom(false);

  });

});
