'use strict';

var util = require('util');
var e2e = require('@openveo/test').e2e;
var Field = e2e.Field;
var BackEndPage = e2e.BackEndPage;
var browserExt = e2e.browser;

/**
 * Creates a new ChapterPage representing the chapters back end page of a media.
 */
function ChapterPage(mediaId) {
  ChapterPage.super_.call(this);

  // Id of the media to test
  this.mediaId = mediaId;

  // Page path
  this.path = 'be/publish/media/' + this.mediaId;

  // Element finders specific to this page
  this.pageDescriptionElement = element(by.binding('CHAPTER.INFO'));
  this.backButtonElement = element(by.binding('UI.BACK'));
  this.timeHeaderElement = element(by.binding('CHAPTER.HEAD_TIME'));
  this.titleHeaderElement = element(by.binding('CHAPTER.HEAD_TITLE'));
  this.newButtonElement = element(by.binding('UI.FORM_NEW'));
  this.editButtonElement = element(by.binding('UI.FORM_EDIT'));
  this.removeButtonElement = element(by.binding('UI.REMOVE'));
  this.beginCutButtonElement = element(by.css('.pull-left .glyphicon-log-out')).element(by.xpath('..'));
  this.endCutButtonElement = element(by.css('.pull-left .glyphicon-log-in')).element(by.xpath('..'));
  this.zoomInButtonElement = element(by.css('.glyphicon-zoom-in')).element(by.xpath('..'));
  this.zoomOutButtonElement = element(by.css('.glyphicon-zoom-out')).element(by.xpath('..'));
  this.formElement = element(by.css('.editform'));
  this.lineElements = element.all(by.css('.chapter-table tbody tr'));
  this.headerElements = element.all(by.css('.chapter-table th'));
  this.saveButtonElements = this.formElement.all(by.css('button'));
  this.timeBarElement = element(by.css('ov-multirange'));
  this.timeBarLabelElements = this.timeBarElement.all(by.css('ov-multirange-labels span'));
}

module.exports = ChapterPage;
util.inherits(ChapterPage, BackEndPage);

/**
 * Checks if the page is loaded.
 *
 * @return {Promise} Promise resolving when page is fully loaded
 */
ChapterPage.prototype.onLoaded = function() {
  return browser.wait(this.EC.presenceOf(this.pageDescriptionElement), 5000, 'Missing chapters page description');
};

/**
 * Finds a line.
 *
 * Iterate through the given list of lines to look for the expected one.
 *
 * @param {Array} lines The list of line elements (tr elements) to look into
 * @param {String} name The name of the line (this value will be compared to the value of each cell)
 * @param {Number} [index] The index in lines to start from
 * @return {Promise} Promise resolving with the line (tr element)
 */
function getLineByIndex(lines, name, index) {
  var self = this;
  var deferred = protractor.promise.defer();
  index = index || 0;

  if (index < lines.length && lines.length) {
    var line = lines[index];

    self.isLine(line, name).then(function(isLine) {
      if (isLine) {

        // Line found
        deferred.fulfill(line);

      } else {

        // Line not found

        // Try next line
        getLineByIndex.call(self, lines, name, ++index).then(function(line) {
          deferred.fulfill(line);
        }, function(error) {
          deferred.reject(error);
        });
      }
    });
  }
  else
    deferred.reject(new Error('No line corresponding to ' + name));

  return deferred.promise;
}

/**
 * Gets all elements in the time bar (including begin and end cuts).
 *
 * @return {Promise} Promise resolving with the list of elements in the time bar
 */
function getTimeBarElements() {
  return browser.executeScript('var scope = angular.element(arguments[0]).scope(); return scope.ranges;',
                               this.timeBarElement.getWebElement());
}

/**
 * Moves an element on the time bar.
 *
 * @param {Number} index The index of the element in the list of time bar elements
 * @param {Number} percent New element position in percent
 * @return {Promise} Promise resolving with the list of elements in the time bar
 */
function moveTimeBarElement(index, percent) {
  return browser.executeScript('var scope = angular.element(arguments[0]).scope(); ' +
                               'scope.ranges[arguments[1]].value = arguments[2]; ' +
                               'scope.updateTime(); ' +
                               'scope.releaseRange(); ' +
                               'scope.$apply();',
                               this.timeBarElement.getWebElement(), index, percent);
}

/**
 * Gets add form fields.
 *
 * @param {ElementFinder} Search engine element
 * @return {Object} The list of fields
 */
ChapterPage.prototype.getAddFormFields = function(form) {
  var fields = {};

  // Time field
  fields.time = Field.get({
    type: 'time',
    name: this.translations.CHAPTER.FORM_TIME,
    baseElement: form
  });

  // Title field
  fields.title = Field.get({
    type: 'text',
    name: this.translations.CHAPTER.FORM_TITLE,
    baseElement: form
  });

  // Description field
  fields.description = Field.get({
    type: 'textarea',
    name: this.translations.CHAPTER.FORM_DESCRIPTION,
    baseElement: form
  });

  return fields;
};

/**
 * Gets line edition form fields.
 *
 * @param {ElementFinder} Search engine element
 * @param {String} [type="chapter"] Line type
 * @return {Object} The list of fields
 */
ChapterPage.prototype.getEditFormFields = function(form, type) {
  var fields = this.getAddFormFields(form);

  if (type === 'cut')
    delete fields.description;

  return fields;
};

/**
 * Adds a new chapter.
 *
 * @param {Object} data Chapter information (time, title and description)
 * @param {Boolean} [cancel] Boolean indicating if chapter must be saved or cancelled, true to cancel
 * @return {Promise} Promise resolving when chapter is added
 */
ChapterPage.prototype.addChapter = function(data, cancel) {
  var self = this;

  // Open add form
  return browserExt.click(this.newButtonElement).then(function() {
    var fields = self.getAddFormFields(self.formElement);
    browser.wait(self.EC.visibilityOf(self.formElement), 1000, 'Missing add chapter form');

    // Set time, title and description
    // Web Driver can't deal with input in time state. TimeField.setValue is not able to dispatch events set on the
    // field, thus updateRange function has to be called manually.
    fields.time.setValue(data.time);
    browser.executeScript('var scope = angular.element(arguments[0]).scope(); scope.updateRange();',
                                   self.formElement.getWebElement());
    fields.title.setValue(data.title);
    fields.description.setValue(data.description);

    // Click the save button
    return browserExt.click(self.saveButtonElements.get((cancel ? 1 : 0)));
  });

};

/**
 * Tests if the given line correspond to the given value.
 *
 * Tests if a value is found in a line's table cells.
 *
 * @param {String|ElementFinder} finder The name of the line (each column will be compared to this value)
 * or the line element (tr element)
 * @param {String} value Value to look for in each column
 */
ChapterPage.prototype.isLine = function(finder, value) {
  var deferred = protractor.promise.defer();

  this.getLine(finder).then(function(line) {
    line.all(by.css('td')).filter(function(tdElement, index) {
      return tdElement.getText().then(function(text) {
        return text === value;
      });
    }).then(function(lines) {
      deferred.fulfill(lines.length ? true : false);
    }, function(error) {
      deferred.reject(error);
    });
  });

  return deferred.promise;
};

/**
 * Gets a line from the table of lines.
 *
 * @param {String|ElementFinder} finder The name of the line (each column will be compared to this value)
 * or the line element (tr element)
 * @return {Promise} Promise resolving with the line (tr element)
 */
ChapterPage.prototype.getLine = function(finder) {
  var self = this;

  if (typeof finder !== 'string')
    return protractor.promise.fulfilled(finder);

  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();
    var lines = [];
    self.lineElements.each(function(element, index) {
      lines.push(element);
    }).then(function() {
      getLineByIndex.call(self, lines, finder).then(function(line) {
        deferred.fulfill(line);
      }, function(error) {
        deferred.reject('Line "' + finder + '" not found');
      });
    });
    return deferred.promise;
  });
};

/**
 * Gets all column / field values of a line.
 *
 * @param {String|ElementFinder} finder The name of the line (each column will be compared to this value) or
 * the line element (tr element)
 * @param {String} [type="chapter"] The line type
 * @return {Promise} Promise resolving with the line details
 */
ChapterPage.prototype.getLineDetails = function(finder, type) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var promises = [self.getCellValues(finder), self.getLineFieldValues(finder, type)];

    return protractor.promise.all(promises);
  }).then(function(values) {
    return protractor.promise.fulfilled({
      cells: values[0],
      fields: values[1]
    });
  });
};

/**
 * Gets field values of a line.
 *
 * @param {String|ElementFinder} finder The name of the line (each column will be compared to this value)
 * or the line element (tr element)
 * @param {String} [type="chapter"] The line type
 * @return {Promise} Promise resolving with the line field values
 */
ChapterPage.prototype.getLineFieldValues = function(finder, type) {
  var self = this;
  var fieldValues = {};

  function getFieldValue(field, fieldName) {
    return field.getValue().then(function(text) {
      fieldValues[fieldName] = text;
    });
  }

  return this.getLine(finder).then(function(line) {
    var promises = [];

    // Select the line
    self.selectLine(line);

    // Open edition form
    browserExt.click(self.editButtonElement);

    // Get all field values
    var fields = self.getEditFormFields(self.formElement, type);

    for (var fieldId in fields)
      promises.push(getFieldValue(fields[fieldId], fieldId));

    return protractor.promise.all(promises);
  }).then(function() {
    return protractor.promise.fulfilled(fieldValues);
  });
};

/**
 * Gets all column values for a line.
 *
 * @param {String|ElementFinder} finder The name of the line (each column will be compared to this value)
 * or the line element (tr element)
 * @return {Promise} Promise resolving with all cell values
 */
ChapterPage.prototype.getCellValues = function(finder) {
  var deferred = protractor.promise.defer();
  var values = [];

  this.getLine(finder).then(function(trElement) {
    trElement.all(by.css('td')).each(function(tdElement, index) {
      tdElement.getText().then(function(value) {
        values.push(value);
      });
    }).then(function() {
      deferred.fulfill(values);
    }, function(error) {
      deferred.reject(error);
    });
  });

  return deferred.promise;
};

/**
 * Gets the index of a header in the list of headers.
 *
 * @param {String} name The title of the header to look for
 * @return {Promise} Promise resolving with the index of the header
 */
ChapterPage.prototype.getTableHeaderIndex = function(name) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();
    var headerIndex;
    self.headerElements.filter(function(thElement, index) {
      return thElement.getText().then(function(text) {
        if (text === name) {
          headerIndex = index;
          return true;
        }

        return false;
      });
    }).then(function(thElements) {
      if (thElements.length)
        deferred.fulfill(headerIndex);
      else
        deferred.reject(new Error('Header ' + name + ' not found'));
    });

    return deferred.promise;
  });
};

/**
 * Selects a line.
 *
 * @param {String|ElementFinder} finder The name of the line (each column will be compared to this value)
 * or the line element (tr element)
 * @return {Promise} Promise resolving when the line is selected
 */
ChapterPage.prototype.selectLine = function(finder) {
  var line;

  return this.getLine(finder).then(function(foundLine) {
    line = foundLine;
    return line.getAttribute('class');
  }).then(function(lineClasses) {

    // Unselect line
    if (lineClasses.indexOf('selected') >= 0)
      browserExt.click(line);

    // Select line
    return browserExt.click(line);

  });
};

/**
 * Unselects a line.
 *
 * @param {String|ElementFinder} finder The name of the line (each column will be compared to this value)
 * or the line element (tr element)
 * @return {Promise} Promise resolving when the line is unselected
 */
ChapterPage.prototype.unselectLine = function(finder) {
  var line;

  return this.getLine(finder).then(function(foundLine) {
    line = foundLine;
    return line.getAttribute('class');
  }).then(function(lineClasses) {

    // Unselect line
    if (lineClasses.indexOf('selected') >= 0)
      return browserExt.click(line);
    else
      return protractor.promise.fulfilled();
  });
};

/**
 * Removes a chapter.
 *
 * @param {String|ElementFinder} chapterFinder The name of the chapter (each column will be compared to this value)
 * or the chapter element (tr element)
 * @return {Promise} Promise resolving when the chapter has been removed
 */
ChapterPage.prototype.removeChapter = function(chapterFinder) {
  var self = this;

  return this.getLine(chapterFinder).then(function(chapter) {

    // Select the chapter
    self.selectLine(chapterFinder);

    // Remove chapter
    return browserExt.click(self.removeButtonElement);

  });
};

/**
 * Tests if a chapter is present on the time bar.
 *
 * @param {String} name The name of the chapter (each column will be compared to this value)
 * @return {Promise} Promise resolving with a boolean indicating if chapter is on the time bar or not
 */
ChapterPage.prototype.isChapterOnTimeBar = function(name) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();

    self.timeBarLabelElements.filter(function(timeBarElement, index) {
      return timeBarElement.getText().then(function(text) {
        return text === name;
      });
    }).then(function(timeBarElements) {
      deferred.fulfill(timeBarElements.length ? true : false);
    }, function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  });
};

/**
 * Tests if a cut is present on the time bar.
 *
 * @param {Boolean} isBeginCut true to search for the begin cut, false to search for the end cut
 * @return {Promise} Promise resolving with a boolean indicating if chapter is on the time bar or not
 */
ChapterPage.prototype.isCutOnTimeBar = function(isBeginCut) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();

    self.timeBarLabelElements.filter(function(timeBarElement, index) {
      return timeBarElement.element(by.css('.glyphicon-log-' + (isBeginCut ? 'out' : 'in'))).isPresent();
    }).then(function(timeBarElements) {
      deferred.fulfill(timeBarElements.length ? true : false);
    }, function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  });
};

/**
 * Edits a chapter.
 *
 * @param {String} name Chapter title
 * @param {Array} data Chapter's data
 * @param {Boolean} [cancel] Boolean indicating if chapter must be saved or cancelled, true to cancel
 * @return {Promise} Promise resolving when chapter is saved
 */
ChapterPage.prototype.editChapter = function(name, data, cancel) {
  var self = this;

  // Get chapter
  return this.getLine(name).then(function(chapter) {

    // Select chapter
    self.selectLine(chapter);

    // Open edition form
    browserExt.click(self.editButtonElement);

    // Get all field values
    var fields = self.getEditFormFields(self.formElement);

    // Set name
    if (data.title !== undefined)
      fields.title.setValue(data.title);

    // Set description
    if (data.description !== undefined)
      fields.description.setValue(data.description);

    // Set time
    if (data.time !== undefined) {
      fields.time.setValue(data.time);
      browser.executeScript('var scope = angular.element(arguments[0]).scope(); scope.updateRange(); scope.$apply();',
                                   self.formElement.getWebElement());
    }

    // Click the save button
    return browserExt.click(self.saveButtonElements.get((cancel ? 1 : 0)));

  });
};

/**
 * Edits a cut.
 *
 * @param {String} time Cut time in format hh:mm:ss
 * @param {Boolean} [isBeginCut=false] true to set the begin cut, false to set the end cut
 * @param {Boolean} [cancel=false] true to cancel edition, false to save the cut
 * @return {Promise} Promise resolving when cut is saved
 */
ChapterPage.prototype.editCut = function(time, isBeginCut, cancel) {
  var self = this;
  var cutTitle = isBeginCut ? this.translations.UI.BEGIN : this.translations.UI.END;

  // Get cut
  return this.getLine(cutTitle).then(function(cut) {

    // Select cut
    self.selectLine(cut);

    // Open edition form
    browserExt.click(self.editButtonElement);

    // Get all field values
    var fields = self.getEditFormFields(self.formElement, 'cut');

    // Set time
    if (time !== undefined) {
      fields.time.setValue(time);
      browser.executeScript('var scope = angular.element(arguments[0]).scope(); scope.updateRange(); scope.$apply();',
                                   self.formElement.getWebElement());
    }

    // Click the save button
    return browserExt.click(self.saveButtonElements.get((cancel ? 1 : 0)));

  });
};

/**
 * Moves mouse over a chapter on the time bar.
 *
 * Web Driver can't control input in range state. To be able to modify the multi-range, the element is controlled
 * by JavaScript.
 *
 * @param {String} name Name of the chapter
 * @return {Promise} Promise resolving when mouse is over the chapter
 */
ChapterPage.prototype.setMouseOverChapterOnTimeBar = function(name) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();

    self.timeBarLabelElements.filter(function(element, index) {
      return element.getText().then(function(text) {
        return text === name;
      });
    }).then(function(chapters) {
      if (chapters.length) {
        browser.actions().mouseMove(chapters[0]).perform().then(function() {
          deferred.fulfill();
        }, function(error) {
          deferred.reject(error);
        });
      } else
        deferred.reject(new Error('Chapter ' + name + ' not found in time bar'));
    }, function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  });
};

/**
 * Moves mouse over cut on the time bar.
 *
 * Web Driver can't control input in range state. To be able to modify the multi-range, the element is controlled
 * by JavaScript.
 *
 * @param {Boolean} isBeginCut true to move mouse over the begin cut, false to move mouse over the end cut
 * @return {Promise} Promise resolving when mouse is over the cut
 */
ChapterPage.prototype.setMouseOverCutOnTimeBar = function(isBeginCut) {
  var self = this;

  return browser.waitForAngular().then(function() {
    var deferred = protractor.promise.defer();

    self.timeBarLabelElements.filter(function(timeBarElement, index) {
      return timeBarElement.element(by.css('.glyphicon-log-' + (isBeginCut ? 'out' : 'in'))).isPresent();
    }).then(function(timeBarElements) {
      if (timeBarElements.length) {
        browser.actions().mouseMove(timeBarElements[0]).perform().then(function() {
          deferred.fulfill();
        }, function(error) {
          deferred.reject(error);
        });
      } else
        deferred.reject(new Error('Cut not found'));
    }, function(error) {
      deferred.reject(error);
    });

    return deferred.promise;
  });
};

/**
 * Moves mouse over cut button.
 *
 * @param {Boolean} isBeginCut true to move mouse over the begin cut button, false to move mouse over the end cut
 * button
 * @return {Promise} Promise resolving when mouse is over the cut button
 */
ChapterPage.prototype.setMouseOverCutButton = function(isBeginCut) {
  var cutButton = isBeginCut ? this.beginCutButtonElement : this.endCutButtonElement;
  return browser.actions().mouseMove(cutButton).perform();
};

/**
 * Moves a chapter using the time bar.
 *
 * Web Driver can't control input in range state. To be able to modify the multi-range, the element is controlled
 * by JavaScript.
 *
 * @param {String} name Name of the chapter to move
 * @param {Number} percent New chapter position in percent
 * @return {Promise} Promise resolving when chapter has been moved
 */
ChapterPage.prototype.moveChapter = function(name, percent) {
  var self = this;

  return this.setMouseOverChapterOnTimeBar(name).then(function() {

    // Get elements in the time bar
    return getTimeBarElements.call(self);
  }).then(function(timeBarElements) {
    var chapterIndex;

    // Find chapter in the list of timeBarElements from the time bar
    for (var i = 0; i < timeBarElements.length; i++) {
      if (timeBarElements[i].name === name) {
        chapterIndex = i;
        break;
      }
    }

    // Move chapter
    return moveTimeBarElement.call(self, chapterIndex, percent);
  });

};

/**
 * Adds cut.
 *
 * @param {Number} percent Cut begin position in percent
 * @param {Boolean} isBeginCut true to set begin cut, false to set end cut
 * @return {Promise} Promise resolving when cut has been added
 */
ChapterPage.prototype.addCut = function(percent, isBeginCut) {
  var self = this;
  var cutButtonElement = isBeginCut ? this.beginCutButtonElement : this.endCutButtonElement;

  return browserExt.click(cutButtonElement).then(function() {
    return self.setMouseOverCutOnTimeBar(isBeginCut);
  }).then(function() {

    // Get elements in the time bar
    return getTimeBarElements.call(self);
  }).then(function(timeBarElements) {
    var index;
    var cutType = isBeginCut ? 'begin' : 'end';

    // Find the index of the begin cut element
    for (var i = 0; i < timeBarElements.length; i++) {
      if (timeBarElements[i].type === cutType) {
        index = i;
        break;
      }
    }

    // Move begin cut
    return moveTimeBarElement.call(self, index, percent);
  });

};

/**
 * Removes cut.
 *
 * @param {Boolean} isBeginCut true to remove begin cut, false to remove end cut
 * @return {Promise} Promise resolving when cut has been removed
 */
ChapterPage.prototype.removeCut = function(isBeginCut) {
  var cutButtonElement = isBeginCut ? this.beginCutButtonElement : this.endCutButtonElement;

  return cutButtonElement.element(by.xpath('..')).getAttribute('class').then(function(classes) {
    if (classes.indexOf('active') >= 0)
      return protractor.promise.fulfilled();
    else
      return browserExt.click(cutButtonElement);
  });

};

/**
 * Zooms the time line (in or out).
 *
 * @param {Boolean} isIn true to zoom in, false to zoom out
 * @return {Promise} Promise resolving when zoom is made
 */
ChapterPage.prototype.zoom = function(isIn) {
  var zoomButtonElement = isIn ? this.zoomInButtonElement : this.zoomOutButtonElement;
  return browserExt.click(zoomButtonElement);
};
