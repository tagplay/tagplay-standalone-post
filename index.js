'use strict';

var img = require('img');
var tagplaytext = require('tagplay-text');
var twemoji = require('twemoji');

module.exports = widget;

function widget (post, opt, onclick) {
  if (typeof opt === 'function') {
    onclick = opt;
    opt = undefined;
  }
  if (!opt) opt = {};

  var client = opt.client;

  var postActions = {
    like: function (has_liked, callback) {
      if (has_liked) {
        client.unlikePost(opt.project, opt.feed, post.id, callback);
      } else {
        client.likePost(opt.project, opt.feed, post.id, callback);
      }
    },

    flag: function (has_flagged, callback) {
      if (has_flagged) {
        client.unflagPost(opt.project, opt.feed, post.id, callback);
      } else {
        client.flagPost(opt.project, opt.feed, post.id, callback);
      }
    }
  };

  var container = document.createElement('div');
  container.setAttribute('class', 'tagplay-media-container tagplay-media-' + post.provider.name);
  if (onclick) {
    container.onclick = onclick;
  }

  var postElem = document.createElement('div');
  postElem.setAttribute('class', 'tagplay-media-inner');

  if (opt['include-usernames']) {
    var usernameElem = text('', 'tagplay-media-username');
    var usernameLink = document.createElement('a');
    var href;
    if (post.provider.name === 'instagram') {
      href = 'https://instagram.com/' + post.provider.username;
    } else if (post.provider.name === 'twitter') {
      href = 'https://twitter.com/' + post.provider.username;
    } else if (post.provider.name === 'facebook') {
      href = 'https://www.facebook.com/' + post.provider.user_id;
    }
    usernameLink.setAttribute('href', href);
    usernameLink.setAttribute('target', '_blank');
    usernameLink.appendChild(document.createTextNode(post.provider.username));
    usernameElem.appendChild(usernameLink);
    postElem.appendChild(usernameElem);
  }

  if (post.image && !opt.no_images || post.video && !opt.no_videos) {
    postElem.appendChild(media(post, opt, onclick));
  }

  var postText = post.text;

  if (opt.include_captions || opt.no_images || post.type === 'text') {
    var textElem = null;
    if (postText) {
      var removeTriggers = opt['hashtags'] === 'remove_triggers'
        ? opt.trigger_tags
        : opt['hashtags'] === 'remove';
      var htmlized = tagplaytext.htmlize(postText, post.provider.name, post.links, removeTriggers, opt.strip_hash);
      postText = twemoji.parse(htmlized);
      if (postText) {
        textElem = text(postText, 'tagplay-media-text');
      }
    }
    if (post.linked_metadata && !opt['include-link-metadata'] && post.text.indexOf(post.linked_metadata.href) === -1) {
      // Add link to text
      var linkElem = document.createElement('a');
      linkElem.setAttribute('href', post.linked_metadata.href);
      linkElem.setAttribute('target', '_blank');
      linkElem.appendChild(document.createTextNode(post.linked_metadata.title || post.linked_metadata.href));

      if (textElem) {
        textElem.appendChild(document.createElement('br'));
        textElem.appendChild(document.createElement('br'));
      } else {
        textElem = text('', 'tagplay-media-text');
      }
      textElem.appendChild(linkElem);
    }
    if (textElem) {
      postElem.appendChild(textElem);
    }
  }
  if (post.linked_metadata && opt['include-link-metadata']) {
    postElem.appendChild(linkInfo(post, opt));
  }
  if (opt['include-like'] || opt['include-flag']) {
    postElem.appendChild(postOptions(post, opt['include-like'], opt['include-flag'], postActions));
  }
  if (opt['include-dates'] || opt['include-times']) {
    postElem.appendChild(text(timestamp(post, opt['include-dates'], opt['include-times']), 'tagplay-media-date'));
  }

  container.appendChild(postElem);

  return container;
}

function icon (iconName, iconText) {
  var el = document.createElement('i');
  el.setAttribute('class', 'tagplay-icon tagplay-icon-' + iconName);
  el.appendChild(document.createTextNode(iconText));
  return el;
}

function likeButton (has_liked, likes, handleClick) {
  var el = document.createElement('span');
  el.setAttribute('class', 'tagplay-like' + (has_liked ? ' tagplay-user-liked' : ''));
  el.appendChild(icon('like', '&#10084;'));
  var textNode = document.createTextNode(' ' + likes);
  el.appendChild(textNode);
  el.onclick = function () {
    handleClick(has_liked, function (err) {
      if (err) {
        alert(err.message);
        return;
      }
      el.parentNode.replaceChild(likeButton(!has_liked, likes + (has_liked ? -1 : 1), handleClick), el);
    });
  };
  return el;
}

function flagButton (has_flagged, handleClick) {
  var el = document.createElement('span');
  el.setAttribute('class', 'tagplay-flag' + (has_flagged ? ' tagplay-user-flagged' : ''));
  el.appendChild(icon('flag', 'Flag'));
  el.onclick = function () {
    handleClick(has_flagged, function (err) {
      if (err) {
        alert(err.message);
        return;
      }
      el.parentNode.replaceChild(flagButton(!has_flagged, handleClick), el);
    });
  };
  return el;
}

function postOptions (post, includeLike, includeFlag, postActions) {
  var el = document.createElement('p');
  el.setAttribute('class', 'tagplay-media-options');
  if (includeLike) {
    el.appendChild(likeButton(post.meta.has_liked, post.meta.likes, postActions.like));
  }
  if (includeFlag) {
    el.appendChild(flagButton(post.meta.has_flagged, postActions.flag));
  }
  return el;
}

function linkInfoLink (post) {
  var el = document.createElement('a');
  el.setAttribute('class', 'tagplay-link-info-link');
  el.setAttribute('href', post.linked_metadata.href);
  el.setAttribute('target', '_blank');

  return el;
}

function linkInfoImage (post) {
  var image = img(post.linked_metadata.image.sources[0].url);
  image.setAttribute('class', 'tagplay-link-info-image');
  var link = linkInfoLink(post);
  link.appendChild(image);

  return link;
}

function linkInfoTitle (post) {
  var el = document.createElement('h4');
  el.setAttribute('class', 'tagplay-link-info-title');

  var link = linkInfoLink(post);
  link.appendChild(document.createTextNode(post.linked_metadata.title || post.linked_metadata.href));

  el.appendChild(link);
  return el;
}

function linkInfoDescription (post) {
  var el = document.createElement('p');
  el.setAttribute('class', 'tagplay-link-info-description');

  var link = linkInfoLink(post);
  link.appendChild(document.createTextNode(post.linked_metadata.description));

  el.appendChild(link);
  return el;
}

function linkInfo (post, opt) {
  var includeImage = !opt['no-link-image'];
  var includeDescription = !opt['no-link-description'];
  var includeEmbed = !opt['no-link-embed'] && opt.inline_link_embed;
  var el = document.createElement('div');
  el.setAttribute('class', 'tagplay-link-info');

  if (includeEmbed) {
    opt.client.getEmbedInfo(post.linked_metadata.href, {}, function (err, data) {
      if (err) {
        // We got an error from iframely - check if the link looks like a video file
        fallback();
        return;
      }
      if (data.links.player) {
        // Use iframely's provided embed HTML
        var embedWrapper = document.createElement('div');
        embedWrapper.setAttribute('class', 'tagplay-link-info-embed');
        embedWrapper.innerHTML = data.links.player[0].html;

        el.appendChild(embedWrapper);
        addTitleDesc();
        if (data.meta.site === 'Facebook') {
          loadFB(el);
        }
      } else {
        // We don't have a player - just use the fallback
        fallback();
      }
    });
  } else {
    fallback();
  }

  function fallback () {
    if (includeImage && post.linked_metadata.image) {
      el.appendChild(linkInfoImage(post));
    }
    addTitleDesc();
  }

  function addTitleDesc () {
    el.appendChild(linkInfoTitle(post));
    if (includeDescription && post.linked_metadata.description) {
      el.appendChild(linkInfoDescription(post));
    }
  }
  return el;
}

function timestamp (post, includeDates, includeTimes) {
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
      } else {
        timeComponents.push(yearCreatedString);
      }
    }
  }
  if (includeTimes) {
    var hours = createdTime.getHours();
    var minutes = createdTime.getMinutes();
    if (minutes < 10) {
      minutes = '0' + minutes;
    }
    timeComponents.push((hours > 12 ? hours - 12 : hours) + ':' + minutes + (hours >= 12 ? 'pm' : 'am'));
  }
  return timeComponents.join(' ');
}

function media (post, opt, onclick) {
  var imgSrc = post.image.sources[0].url;

  var mediaElem = document.createElement('div');
  mediaElem.setAttribute('class', 'tagplay-media');

  var image = img(imgSrc);
  image.setAttribute('class', 'tagplay-media-object');
  var a = link(post.provider.origin || imgSrc);
  a.appendChild(image);

  if (onclick) {
    // We have an onclick handler for the post - stop the link from acting as a link
    a.onclick = function (e) {
      if (!e) e = window.event;
      if (onclick) {
        e.returnValue = false;
        if (e.preventDefault) e.preventDefault();
      }
    };
  }

  if (post.type === 'video' && !opt.no_videos) {
    if (opt.inline_video) {
      var vidSrc = post.video.sources[0].url;
      var options = {};
      if (opt.play_video) {
        options.autoplay = 1;
      }
      opt.client.getEmbedInfo(vidSrc, options, function (err, data) {
        if (err) {
          // We got an error from iframely - check if the link looks like a video file
          if (vidSrc.substring(vidSrc.length - 4) === '.mp4') {
            mediaElem.appendChild(vid(vidSrc, imgSrc, opt.play_video, opt.play_sound));
          } else {
            mediaElem.appendChild(a);
          }
          return;
        }
        if (data.links.file) {
          // Just play the file as a normal video
          var video = vid(data.links.file[0].href, imgSrc, opt.play_video, opt.play_sound);
          video.appendChild(a);
          mediaElem.appendChild(video);
        } else if (data.links.player) {
          var embedWrapper = document.createElement('div');
          embedWrapper.setAttribute('class', 'tagplay-media-embed');
          if (data.links.player[0].href) {
            // Simple embed iframe
            embedWrapper.appendChild(embed(data.links.player[0].href, post.video.sources[0].width, post.video.sources[0].height));
          } else {
            // Use iframely's provided embed HTML
            embedWrapper.innerHTML = data.links.player[0].html;

            if (data.meta.site === 'Facebook') {
              loadFB(embedWrapper);
            }
          }
          mediaElem.appendChild(embedWrapper);
        } else {
          // We don't have a player - just append the a
          mediaElem.appendChild(a);
        }
      });
    } else if (opt.lightbox) {
      // This is a video, but we're not showing it inline
      mediaElem.setAttribute('class', 'tagplay-media tagplay-media-video');
      mediaElem.appendChild(a);
    }
  } else {
    mediaElem.appendChild(a);
  }
  return mediaElem;
}

function embed (src, width, height) {
  var div = document.createElement('div');
  div.setAttribute('class', 'tagplay-embed-iframe');
  div.style.paddingBottom = (height * 100 / width) + '%';

  var iframe = document.createElement('iframe');
  iframe.setAttribute('src', src);

  div.appendChild(iframe);
  return div;
}

function vid (src, poster, autoplay, playSound) {
  var video = document.createElement('video');
  video.setAttribute('class', 'tagplay-media-object');
  video.setAttribute('src', src);
  video.setAttribute('controls', true);
  video.setAttribute('preload', 'auto');
  if (!playSound) video.setAttribute('muted', true);
  if (autoplay) video.setAttribute('autoplay', true);
  if (poster) video.setAttribute('poster', poster);
  return video;
}

function text (txt, className) {
  var el = document.createElement('p');
  el.setAttribute('class', className);
  el.innerHTML = txt;
  return el;
}

function link (href) {
  var linkElem = document.createElement('a');
  linkElem.setAttribute('href', href);
  linkElem.setAttribute('class', 'tagplay-media-link');
  linkElem.setAttribute('target', '_blank');
  return linkElem;
}

function loadFB (elem) {
  (function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
      // We've already loaded the Facebook SDK - just parse the element
      FB.XFBML.parse(elem);
    } else {
      // Parse the element on init, then fetch the SDK
      window.fbAsyncInit = function () {
        FB.init({
          xfbml      : true,
          version    : 'v2.8'
        });
        FB.XFBML.parse(elem);
      };
      js = d.createElement(s); js.id = id;
      js.src = '//connect.facebook.net/en_US/sdk.js';
      fjs.parentNode.insertBefore(js, fjs);
    }
  }(document, 'script', 'facebook-jssdk'));
}
