'use strict';

var img = require('img');

module.exports = widget;

function widget (post, opt, callback) {
  if (typeof opt === 'function') {
    callback = opt;
    opt = undefined;
  }
  if (!opt) opt = {};

  var container = document.createElement('div');
  container.setAttribute('class', 'tagplay-media-container tagplay-media-' + post.provider.name);

  var postElem = document.createElement('div');
  postElem.setAttribute('class', 'tagplay-media-inner');

  if (opt['include-usernames']) {
    postElem.appendChild(text(post.provider.username, 'tagplay-media-username'));
  }

  if (opt['no-images']) {
    // do nothing
  } else if (post.image) {
    postElem.appendChild(media(post, opt['no-videos']));
  }

  if (post.normalized_text && (opt['include-captions'] || opt['no-images'] || post.type === 'text')) {
    postElem.appendChild(text(post.normalized_text, 'tagplay-media-text'));
  }
  if (opt['include-dates'] || opt['include-times']) {
    postElem.appendChild(text(timestamp(post, opt['include-dates'], opt['include-times']), 'tagplay-media-date'));
  }

  container.appendChild(postElem);

  return container;
}

function timestamp(post, includeDates, includeTimes) {
  var createdTime = new Date(post.provider.created_time);
  var now = new Date();
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var timeComponents = [];

  if (includeDates) {
    var yearCreatedString = createdTime.getFullYear().toString();
    var yearNowString = now.getFullYear().toString();
    timeComponents.push(createdTime.getDate());
    timeComponents.push(months[createdTime.getMonth()]);
    if (yearCreatedString !== yearNowString) {
      if (yearCreatedString.substring(0, 2) === yearNowString.substring(0, 2)) {
        timeComponents.push(yearCreatedString.substring(2));
      }
      else {
        timeComponents.push(yearCreatedString);
      }
    }
  }
  if (includeTimes) {
    var hours = createdTime.getHours();
    var minutes = createdTime.getMinutes();
    if (minutes < 10) {
      minutes = "0" + minutes;
    }
    timeComponents.push((hours > 12 ? hours - 12 : hours) + ":" + minutes + (hours >= 12 ? "pm" : "am"));
  }
  return timeComponents.join(" ");
}

function media(post, noVideo) {
  var imgSrc = post.image.sources[0].url;

  var mediaElem = document.createElement('div');
  mediaElem.setAttribute('class', 'tagplay-media');

  var image = img(imgSrc);
  image.setAttribute('class', 'tagplay-media-object');
  var a = link(post.provider.origin || imgSrc);
  a.appendChild(image);

  if (post.type === 'video' && !noVideo) {
    var video = vid(post.video.sources[0].url, imgSrc);
    video.appendChild(a);
    mediaElem.appendChild(video);
  } else {
    mediaElem.appendChild(a);
  }
  return mediaElem;
}

function vid(src, poster) {
  var video = document.createElement('video');
  video.setAttribute('class', 'tagplay-media-object');
  video.setAttribute('src', src);
  video.setAttribute('controls', true);
  video.setAttribute('preload', 'auto');
  if (poster) video.setAttribute('poster', poster);
  return video;
}

function text(txt, className) {
  var el = document.createElement('p');
  el.setAttribute('class', className);
  var textNode = document.createTextNode(txt);
  el.appendChild(textNode);
  return el;
}

function link(href) {
  var linkElem = document.createElement('a');
  linkElem.setAttribute('href', href);
  linkElem.setAttribute('class', 'tagplay-media-link');
  return linkElem;
}
