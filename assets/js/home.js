$(document).ready(function () {
  //Configure countdown interval
  var countdown_reset = 30

  var nodes = {}
  var geoIpCache = {}
  var countdown = countdown_reset
  var intervalId = undefined
  var hasChanged = function (val) {
    if (!nodes[val.vpn]) {
      nodes[val.vpn] = val
      logEvent(val.name, 'connected')
      return true
    } else if (nodes[val.vpn].timestamp !== val.timestamp) {
      nodes[val.vpn] = val
      return true
    }
  }
  var logEvent = function (node, event) {
    var data = {
      event: event,
      node: node,
      help: '',
      icon: '',
      timestamp: moment().format('HH:mm')
    }
    if (event === 'connected') {
      data.help = 'This node just established a connection to the server.'
      data.icon = 'fa-plug'
    } else if (event === 'disconnected') {
      data.help = 'This node just closed the connection to the server.'
      data.icon = 'fa-remove'
    }
    $('#log').prepend($.markup('log-entry', data))
  }
  var refreshData = function () {
    countdown = countdown_reset
    $('#txt_refresh').html('&nbsp;' + countdown)
    clearInterval(intervalId)
    $.get('/updated', function (response) {
      response = JSON.parse(response)
      $('#lbl_updated').text(response.value)
    })
    $.get('/entries', function (response) {
      response = JSON.parse(response)
      response = _.sortBy(response, function (itm) {
        return itm.name
      })
      _.forIn(nodes, function (val, key) {
        if (!_.findWhere(response, { vpn: key })) {
          logEvent(val.name, 'disconnected')
          delete nodes[key]
        }
      })
      $('#nodes > tr').remove()
      _.each(response, function (item) {
        if (hasChanged(item) && !geoIpCache[item.pub])
          $.get('https://crossorigin.me/https://freegeoip.net/json/' + item.pub)
            .done(function (data) {
              $('#flag_' + item.name).attr('src', '/assets/images/flags/' + data.country_code + '.png')
              $('#flag_' + item.name).attr('title', data.country_name)
              geoIpCache[item.pub] = data
            })
            .error(function () {
              $('#flag_' + item.name).attr('src', '/assets/images/flags/unknown.jpg')
              $('#flag_' + item.name).attr('title', 'Unknown Country')
            })
        else {
          $('#flag_' + item.name).attr('src', '/assets/images/flags/' + geoIpCache[item.pub].country_code + '.png')
          $('#flag_' + item.name).attr('title', geoIpCache[item.pub].country_name)
        }
        item.timestamp = moment(item.timestamp * 1000).format('HH:mm - DD.MM.YYYY')
        item.changed = hasChanged(item) ? 'highlight' : ''
        $('#nodes').append($.markup('status-entry', item))
      })
      enableAutoRefresh()
    })
  }
  var enableAutoRefresh = function () {
    intervalId = setInterval(function () {
      if (countdown === 0)
        refreshData()
      else {
        countdown--
        $('#txt_refresh').html('&nbsp;' + countdown)
      }
    }, 1000)
  }
  $.markup.load(function () {
    refreshData()
    $('#txt_refresh').html('&nbsp;' + countdown)
    $('#btn_refresh').click(function () {
      refreshData()
    })
    $('#btn_clear_log').click(function () {
      $('#log > tr').remove()
    })
    $('#btn_refresh').hover(function () {
      $('#btn_refresh > i').addClass('fa-spin')
    }, function () {
      $('#btn_refresh > i').removeClass('fa-spin')
    })
  })
})
