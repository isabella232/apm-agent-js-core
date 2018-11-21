var patchUtils = require('../../src/common/patching/patch-utils')

var urlSympbol = patchUtils.XHR_URL
var methodSymbol = patchUtils.XHR_METHOD
var xhrIgnore = patchUtils.XHR_IGNORE


var patchSubscription = require('./patch')


describe('xhrPatch', function () {
  var events = []
  var cancelFn

  beforeAll(function () {
    cancelFn = patchSubscription.subscribe(function (event, task) {
      events.push({
        event,
        task
      })
    })
  })

  afterAll(function () {
    cancelFn()
  })

  function mapEvent(event) {
    delete event.task.data.target
    event.task.data.args = [].slice.call(event.task.data.args)
    return event
  }

  function printEvents() {
    console.log(JSON.stringify(events.map(mapEvent), undefined, 2))
  }
  beforeEach(function () {
    events = []
  })
  it('should have correct url and method', function () {
    var req = new window.XMLHttpRequest()
    req.open('GET', '/', true)
    expect(req[urlSympbol]).toBe('/')
    expect(req[methodSymbol]).toBe('GET')
  })

  it('should produce events', function (done) {
    var req = new window.XMLHttpRequest()
    req.open('GET', '/', true)
    req.addEventListener("load", function () {
      expect(events.map(mapEvent))
        .toEqual(
          [
            {
              "event": "schedule",
              "task": {
                "source": "XMLHttpRequest.send",
                "state": "invoke",
                "type": "macroTask",
                "ignore": undefined,
                "data": {
                  "method": "GET",
                  "url": "/",
                  "sync": false,
                  "args": [],
                  "aborted": false,
                }
              }
            },
            {
              "event": "invoke",
              "task": {
                "source": "XMLHttpRequest.send",
                "state": "invoke",
                "type": "macroTask",
                "ignore": undefined,
                "data": {
                  "method": "GET",
                  "url": "/",
                  "sync": false,
                  "args": [],
                  "aborted": false,
                }
              }
            }
          ]
        )
      done()
    });

    req.send()
  })

  it('should work with synchronous xhr', function (done) {
    var req = new window.XMLHttpRequest()
    req.open('GET', '/', false)
    req.addEventListener("load", function () {
      done()
    });

    req.send()
    expect(events.map(e => e.event)).toEqual(['schedule', 'invoke'])
  })

  it('should work with failing xhr', function (done) {
    var req = new window.XMLHttpRequest()
    req.open('GET', '/test.json', true)
    req.addEventListener("load", function () {
      expect(events.map(e => e.event)).toEqual(['schedule', 'invoke'])
      done()
    });

    req.send()
  })

  it('should work with aborted xhr', function () {
    var req = new XMLHttpRequest()
    req.open('GET', '/', true)

    req.send()
    req.abort()
    expect(events.map(e => e.event)).toEqual(['schedule', 'clear'])
  })

  it('should work properly when send request multiple times on single xmlRequest instance', function (done) {
    const req = new XMLHttpRequest();
    req.open('get', '/', true);
    req.send();
    req.onload = function () {
      req.onload = null;
      req.open('get', '/', true);
      req.onload = function () {
        expect(events.map(e => e.event)).toEqual(['schedule', 'invoke', 'schedule', 'invoke'])
        done();
      };
      expect(() => {
        req.send();
      }).not.toThrow();
    };
  })

  it('should preserve static constants', function () {
    expect(XMLHttpRequest.UNSENT).toEqual(0);
    expect(XMLHttpRequest.OPENED).toEqual(1);
    expect(XMLHttpRequest.HEADERS_RECEIVED).toEqual(2);
    expect(XMLHttpRequest.LOADING).toEqual(3);
    expect(XMLHttpRequest.DONE).toEqual(4);
  });


  it('should work correctly when abort was called multiple times before request is done',
    function (done) {
      const req = new XMLHttpRequest();
      req.open('get', '/', true);
      req.send();
      req.addEventListener('readystatechange', function (ev) {
        if (req.readyState >= 2) {
          expect(() => {
            req.abort();
          }).not.toThrow();
          done();
        }
      });
    });

  it('should return null when access ontimeout first time without error', function () {
    let req = new XMLHttpRequest();
    expect(req.ontimeout).toBe(null);
  });


  it('should allow aborting an XMLHttpRequest after its completed', function (done) {
    let req;

    req = new XMLHttpRequest();
    req.onreadystatechange = function () {
      if (req.readyState === XMLHttpRequest.DONE) {
        if (req.status !== 0) {
          setTimeout(function () {
            req.abort();
            done();
          }, 0);
        }
      }
    };
    req.open('get', '/', true);

    req.send();
  });

  it('should preserve other setters', function () {
    const req = new XMLHttpRequest();
    req.open('get', '/', true);
    req.send();
    try {
      req.responseType = 'document';
      expect(req.responseType).toBe('document');
    } catch (e) {
      // Android browser: using this setter throws, this should be preserved
      expect(e.message).toBe('INVALID_STATE_ERR: DOM Exception 11');
    }
  });



  it('should not throw error when get XMLHttpRequest.prototype.onreadystatechange the first time',
    function () {
      const func = function () {
        const req = new XMLHttpRequest();
        req.onreadystatechange;
      };
      expect(func).not.toThrow();
    });

  it('should consider xhr ignore', function (done) {
    var req = new window.XMLHttpRequest()
    req[xhrIgnore] = true
    req.open('GET', '/')
    req.addEventListener("load", function () {
      done()
    });

    req.send()
    expect(events.map(e => e.event)).toEqual([])
  })
})


