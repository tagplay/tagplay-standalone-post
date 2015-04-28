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
  container.setAttribute('class', 'tagplay-media-container');

  if (opt['include-usernames']) {
    container.appendChild(text('@' + post.provider.username, 'tagplay-media-username'));
  }

  if (opt['no-images'] && opt['no-videos']) {
    // do nothing
  } else if (post.type === 'image' && !opt['no-images']) {
    container.appendChild(media(post));
  } else if (post.type === 'video') {
    container.appendChild(media(post, opt['no-videos']));
  }

  if (opt['include-captions']) {
    container.appendChild(text(post.normalized_text, 'tagplay-media-text'));
  }
  if (opt['include-dates']) {
    var time = post.provider.created_time.replace('T', ' ').substring(0,16);
    container.appendChild(text(time, 'tagplay-media-date'));
  }

  return container;
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
