'use strict';

var img = require('img');
var tagplaytext = require('tagplay-text');
var twemoji = require('twemoji');

module.exports = widget;

function isPostEmpty (post, opt) {
  return !post.text && !((post.images.length > 0 || post.videos.length > 0) && !opt.no_images) && !(post.videos.length > 0 && !opt.no_videos) && !(post.linked_metadata && opt.include_link_metadata);
}

function widget (post, opt, onclick, mediaIndex) {
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

  if (isPostEmpty(post, opt)) {
    // We want the container to be empty
    if (opt.type === 'waterfall') {
      // Hide the post completely
      container.style.display = 'none';
    }
    return container;
  }

  if (onclick) {
    container.onclick = onclick;
  }

  var postElem = document.createElement('div');
  postElem.setAttribute('class', 'tagplay-media-inner');

  var numMedia = getPostMedia(post, opt).length;

  if (mediaIndex !== undefined && numMedia > 1) {
    var indexElem = document.createElement('div');
    indexElem.setAttribute('class', 'tagplay-media-index');
    indexElem.innerHTML = (mediaIndex + 1) + ' / ' + (numMedia);
    postElem.appendChild(indexElem);
  }

  if (opt.include_usernames) {
    var href;
    if (post.provider.name === 'instagram') {
      href = 'https://instagram.com/' + post.provider.username;
    } else if (post.provider.name === 'twitter') {
      href = 'https://twitter.com/' + post.provider.username;
    } else if (post.provider.name === 'facebook') {
      href = 'https://www.facebook.com/' + post.provider.user_id;
    } else if (post.provider.name === 'youtube') {
      href = 'https://www.youtube.com/channel/' + post.provider.user_id;
    } else if (post.provider.origin) {
      href = post.provider.origin;
    }
    var usernameElem = text('', 'tagplay-media-username');
    var usernameLink = document.createElement('a');
    if (href) usernameLink.setAttribute('href', href);
    usernameLink.setAttribute('target', '_blank');
    usernameLink.appendChild(document.createTextNode(post.provider.username));
    usernameElem.appendChild(usernameLink);
    postElem.appendChild(usernameElem);
  }

  var hasMedia = post.images.length > 0 && !opt.no_images || post.videos.length > 0 && !opt.no_videos;

  if (hasMedia) {
    if (numMedia > 1 && mediaIndex === undefined) {
      postElem.appendChild(mediaMultiple(post, opt, onclick));
    } else {
      postElem.appendChild(media(post, opt, onclick, mediaIndex));
    }
  }

  var postText = post.text;

  if ((opt.include_captions || !hasMedia) && (!opt.no_link_captions || !post.linked_metadata || !opt.include_link_metadata)) {
    var textElem = null;
    if (postText) {
      var removeTriggers = opt.hashtags === 'remove_triggers'
        ? opt.trigger_tags
        : opt.hashtags === 'remove';
      var htmlized = tagplaytext.htmlize(postText, post.formatting, post.provider.name, post.links, removeTriggers, opt.strip_hash);
      postText = twemoji.parse(htmlized);
      if (postText) {
        textElem = text(postText, 'tagplay-media-text');
      }
    }
    if (post.linked_metadata && !opt.include_link_metadata && post.text.indexOf(post.linked_metadata.href) === -1) {
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
  if (post.linked_metadata && opt.include_link_metadata) {
    postElem.appendChild(linkInfo(post, opt));
  }
  if (opt.include_like || opt.include_flag) {
    postElem.appendChild(postOptions(post, opt.include_like, opt.include_flag, postActions));
  }
  if (opt.include_dates || opt.include_times) {
    postElem.appendChild(text(timestamp(post, opt.include_dates, opt.include_times), 'tagplay-media-date'));
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
  var image = img(post.linked_metadata.image.sources[0].url, function (err, elem) {
    if (err) {
      if (image.parentNode && image.parentNode.parentNode) {
        image.parentNode.parentNode.removeChild(image.parentNode);
      }
    }
  });
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

function linkInfoDescription (post, opt) {
  var el = document.createElement('p');
  el.setAttribute('class', 'tagplay-link-info-description');

  var link = linkInfoLink(post);

  var description = post.linked_metadata.description;

  if (!opt.full_link_description && opt.lightbox) {
    description = description.substring(0, 100);
    if (post.linked_metadata.description.length > 100) {
      description += '...';
    }
  }

  var htmlized = tagplaytext.htmlize(description, 'plaintext', post.provider.name);
  link.innerHTML = twemoji.parse(htmlized);

  el.appendChild(link);
  return el;
}

function linkInfo (post, opt) {
  var includeImage = !opt.no_link_image;
  var includeDescription = !opt.no_link_description;
  var includeEmbed = !opt.no_link_embed && opt.inline_link_embed;
  var el = document.createElement('div');
  el.setAttribute('class', 'tagplay-link-info');

  var spinner;

  if (includeEmbed) {
    spinner = loadingSpinner();
    el.appendChild(spinner);
    opt.client.getEmbedInfo(post.linked_metadata.href, {}, function (err, data) {
      if (err) {
        // We got an error from iframely - use fallback
        fallback();
        return;
      }
      // Check the current width of the link info element - don't embed if it's too small
      var width = el.clientWidth;
      if ((data.links.player || data.links.app) && width >= 250) {
        // Use iframely's provided embed HTML
        var embedWrapper = document.createElement('div');
        embedWrapper.setAttribute('class', 'tagplay-link-info-embed');
        spinner.setAttribute('class', 'tagplay-spinner tagplay-spinner-absolute');
        el.removeChild(spinner);
        embedWrapper.appendChild(spinner);
        embedWrapper.innerHTML += data.links.player && data.links.player[0].html || data.links.app && data.links.app[0].html;

        el.appendChild(embedWrapper);
        if (data.links.player) {
          // Only add title and description if it's a player, not an app
          addTitleDesc();
        }
        if (data.meta.site === 'Facebook') {
          loadFB(el);
        } else if (data.meta.site === 'Twitter') {
          loadTwitter(el);
        } else if (data.meta.site === 'Instagram') {
          loadInstagram(el);
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
    if (spinner) el.removeChild(spinner);
    if (includeImage && post.linked_metadata.image) {
      el.appendChild(linkInfoImage(post));
    }
    addTitleDesc();
  }

  function addTitleDesc () {
    el.appendChild(linkInfoTitle(post));
    if (includeDescription && post.linked_metadata.description) {
      el.appendChild(linkInfoDescription(post, opt));
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

function mediaMultiple (post, opt, onclick) {
  function getNormalizedHeight (image) {
    return image.sources[0].height * 100 / image.sources[0].width;
  }

  function appendContent (parent, content) {
    if (!content.forEach) {
      content = [content];
    }
    content.forEach(function (child) {
      parent.appendChild(child);
    });
    return content;
  }

  function div (content, className) {
    var el = document.createElement('div');
    if (className) {
      el.setAttribute('class', className);
    }
    appendContent(el, content);
    return el;
  }

  function arrangeMediaElements (pattern, medias, numPhotos) {
    function row (content) {
      return div(content, 'tagplay-media-multi-row');
    }

    function cell (content, width) {
      if (!width) width = 50;
      var el = document.createElement('div');
      el.setAttribute('class', 'tagplay-media-multi-cell');
      el.style.width = width + '%';
      appendContent(el, content);
      return el;
    }

    function mediaElement (media, height) {
      // Use the poster for videos
      if (!height) {
        height = getNormalizedHeight(media);
      }
      // If we have a poster property, it's a video and we want the poster or nothing; if not, it's an image and we want it
      var isVideo = 'poster' in media;
      var source = isVideo ? media.poster && media.poster.sources[0] : media.sources[0];
      var el = document.createElement('div');
      el.setAttribute('class', 'tagplay-media-multi-object' + (isVideo && !opt.no_videos ? ' tagplay-media-video' : ''));
      el.style.paddingBottom = height + '%';
      if (source) {
        el.style.backgroundImage = 'url(' + source.url + ')';
      } else {
        // Black background fallback for videos with no poster
        el.style.backgroundColor = '#000';
      }
      return el;
    }

    var patterns = {
      'side-by-side': function (medias, aspectRatioObj) {
        var aspectRatio = medias.reduce(function (sum, media) {
          return sum + getNormalizedHeight(media);
        }, 0) / medias.length;

        return medias.map(function (media, i) {
          return cell(mediaElement(media, aspectRatio), 100 / medias.length);
        });
      },
      'stacked': function (medias, aspectRatioObj) {
        return medias.map(function (media) {
          return row(mediaElement(media, 100 / medias.length));
        });
      },
      'landscape-portraits': function (medias, aspectRatioObj) {
        var aspectRatio = aspectRatioObj.portrait.reduce(function (sum, media) {
          return sum + getNormalizedHeight(media);
        }, 0) / 2;

        return [
          row(mediaElement(aspectRatioObj.landscape[0])),
          row(aspectRatioObj.portrait.map(function (media) {
            return cell(mediaElement(media, aspectRatio));
          }))
        ];
      },
      'portrait-landscapes': function (medias, aspectRatioObj) {
        var aspectRatio = (getNormalizedHeight(aspectRatioObj.portrait[0]) + aspectRatioObj.landscape.reduce(function (sum, media) {
          return sum + getNormalizedHeight(media);
        }, 0)) / 2;
        return [
          cell(mediaElement(aspectRatioObj.portrait[0], aspectRatio)),
          cell(aspectRatioObj.landscape.map(function (media) {
            return row(mediaElement(media, aspectRatio / 2));
          }))
        ];
      },
      'two-squares': function (medias, aspectRatioObj) {
        return medias.map(function (media) {
          return cell(mediaElement(media, 100));
        });
      },
      'three-squares': function (medias, aspectRatioObj) {
        return [
          row(mediaElement(medias[0], 100)),
          row([
            cell(mediaElement(medias[1], 100)),
            cell(mediaElement(medias[2], 100))
          ])
        ];
      },
      'two-by-two': function (medias, aspectRatioObj) {
        var span = document.createElement('span');
        span.setAttribute('class', 'tagplay-media-multi-more-text');
        span.appendChild(document.createTextNode('+' + (numPhotos - 3)));
        return [
          row([
            cell(mediaElement(medias[0], 100)),
            cell(mediaElement(medias[1], 100))
          ]),
          row([
            cell(mediaElement(medias[2], 100)),
            cell(numPhotos > 4 ? [
              mediaElement(medias[3], 100),
              div(span, 'tagplay-media-multi-more')
            ] : mediaElement(medias[3], 100))
          ])
        ];
      }
    };

    return patterns[pattern](medias, aspectRatioObj);
  }

  function getPattern (medias) {
    var totalMedias = medias.portrait.length + medias.landscape.length;
    if (totalMedias >= 4) {
      return 'two-by-two';
    } else if (medias.portrait.length === 3) {
      // Three portraits; one big square and two smaller below
      return 'three-squares';
    } else if (medias.portrait.length === 0) {
      // Two or three landscapes; stack them
      return 'stacked';
    } else if (medias.landscape.length === 0) {
      // Put them side by side
      return 'side-by-side';
    } else if (medias.portrait.length === 1 && medias.landscape.length === 1) {
      // Two squares side by side
      return 'two-squares';
    } else if (medias.portrait.length === 1) {
      // One portrait, two landscapes
      return 'portrait-landscapes';
    } else {
      // Two portraits, one landscape
      return 'landscape-portraits';
    }
  }

  function splitByAspectRatio (images) {
    var obj = {portrait: [], landscape: []};
    images.forEach(function (image, i) {
      image.index = i;
      if (image.sources[0].height >= image.sources[0].width) {
        obj.portrait.push(image);
      } else {
        obj.landscape.push(image);
      }
    });
    return obj;
  }

  var medias = getPostMedia(post, opt);

  var aspectRatioObj = splitByAspectRatio(medias.slice(0, 4));

  var pattern = getPattern(aspectRatioObj);

  return div(arrangeMediaElements(pattern, medias, aspectRatioObj, medias.length), 'tagplay-media tagplay-media-multi');
}

function getPostMedia (post, opt) {
  if (opt.no_images) {
    return post.videos;
  } else {
    var medias = post.videos.concat(post.images);
    medias.sort(function (a, b) {
      if ((a.order === null || a.order === undefined) && (b.order === null || b.order === undefined)) return 0;
      if (b.order === null || b.order === undefined) return -1;
      if (a.order === null || a.order === undefined) return 1;
      return a.order - b.order;
    });
    return medias;
  }
}

function imageFallback (width, height) {
  var image = document.createElement('div');
  image.style.paddingTop = (width ? height * 100 / width : 100) + '%';
  image.style.backgroundColor = '#000';
  return image;
}

function media (post, opt, onclick, mediaIndex) {
  var postMedia = getPostMedia(post, opt);
  var selectedMedia = postMedia[mediaIndex || 0];

  var imgSrc = 'poster' in selectedMedia ? selectedMedia.poster && selectedMedia.poster.sources[0].url : selectedMedia.sources[0].url;

  var mediaElem = document.createElement('div');
  mediaElem.setAttribute('class', 'tagplay-media');

  var image;
  if (imgSrc) {
    image = img(imgSrc, function (err, elem) {
      if (err) {
        if (image.parentNode && image.parentNode.parentNode && image.parentNode.parentNode.parentNode) {
          if (image.parentNode.parentNode.nodeName === 'VIDEO') {
            // Just remove the fallback link and image.
            image.parentNode.parentNode.removeChild(image.parentNode);
          } else if (image.parentNode.parentNode.className.indexOf('tagplay-media-video') !== -1) {
            // We'd rather the fallback for a video be a black box.
            var parent = image.parentNode;
            parent.removeChild(image);
            parent.appendChild(imageFallback(selectedMedia.sources[0].width, selectedMedia.sources[0].height));
          } else {
            // This is presumably just an image
            image.parentNode.parentNode.parentNode.removeChild(image.parentNode.parentNode);
          }
        }
      }
    });
  } else {
    // Black background fallback
    image = imageFallback(selectedMedia.sources[0].width, selectedMedia.sources[0].height);
  }
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

  if ('poster' in selectedMedia && !opt.no_videos) {
    var video;
    if (opt.inline_video) {
      var vidSrc = selectedMedia.sources[0].url;

      if (selectedMedia.sources[0].source_type === 'video') {
        video = vid(vidSrc, imgSrc, opt.play_video, opt.play_sound);
        video.appendChild(a);
        mediaElem.appendChild(video);
      } else if (selectedMedia.sources[0].source_type === 'embed') {
        var options = {};
        if (opt.play_video) {
          options.autoplay = 1;
        }
        var spinner = loadingSpinner();
        mediaElem.appendChild(spinner);
        opt.client.getEmbedInfo(vidSrc, options, function (err, data) {
          if (err) {
            mediaElem.removeChild(spinner);
            // We got an error from iframely - check if the link looks like a video file
            if (vidSrc.source_type === 'video') {
              video = vid(vidSrc, imgSrc, opt.play_video, opt.play_sound);
              video.appendChild(a);
              mediaElem.appendChild(video);
            } else {
              mediaElem.appendChild(a);
            }
            return;
          }
          if (data.links.file) {
            // Just play the file as a normal video
            mediaElem.removeChild(spinner);
            video = vid(data.links.file[0].href, imgSrc, opt.play_video, opt.play_sound);
            video.appendChild(a);
            mediaElem.appendChild(video);
          } else if (data.links.player || data.links.app) {
            var embedWrapper = document.createElement('div');
            embedWrapper.setAttribute('class', 'tagplay-media-embed');
            spinner.setAttribute('class', 'tagplay-spinner tagplay-spinner-absolute');
            mediaElem.removeChild(spinner);
            embedWrapper.appendChild(spinner);
            if (data.links.player && data.links.player[0].href) {
              // Simple embed iframe
              embedWrapper.appendChild(embed(data.links.player[0].href, selectedMedia.sources[0].width, selectedMedia.sources[0].height));
              mediaElem.appendChild(embedWrapper);
            } else {
              // Use iframely's provided embed HTML
              embedWrapper.innerHTML += data.links.player && data.links.player[0].html || data.links.app && data.links.app[0].html;
              mediaElem.appendChild(embedWrapper);

              if (data.meta.site === 'Facebook') {
                loadFB(embedWrapper);
              } else if (data.meta.site === 'Twitter') {
                loadTwitter(embedWrapper);
                embedWrapper.className += ' tagplay-media-embed-tweet';
              }
            }
          } else {
            // We don't have a player - just remove the spinner and append the a
            mediaElem.removeChild(spinner);
            mediaElem.appendChild(a);
          }
        });
      } else {
        mediaElem.appendChild(a);
      }
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

function loadingSpinner () {
  var spinner = document.createElement('div');
  spinner.setAttribute('class', 'tagplay-spinner');
  return spinner;
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

function loadTwitter (elem) {
  if (window.twttr && window.twttr.widgets) {
    twttr.widgets.load();
  } else {
    window.twttr = (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0],
        t = window.twttr || {};
      if (d.getElementById(id)) return t;
      js = d.createElement(s);
      js.id = id;
      js.src = 'https://platform.twitter.com/widgets.js';
      fjs.parentNode.insertBefore(js, fjs);

      t._e = [];
      t.ready = function (f) {
        t._e.push(f);
      };

      return t;
    }(document, 'script', 'twitter-wjs'));
  }
}

function loadInstagram (elem) {
  if (window.instgrm && window.instgrm.Embeds) {
    instgrm.Embeds.process();
  } else {
    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0],
        t = window.instgrm || {};
      if (d.getElementById(id)) return t;
      js = d.createElement(s);
      js.id = id;
      js.src = 'https://platform.instagram.com/en_US/embeds.js';
      fjs.parentNode.insertBefore(js, fjs);

      return t;
    }(document, 'script', 'instagram-wjs'));
  }
}
