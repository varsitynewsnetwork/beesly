const Http = require('../../src/http/http').default;

Http.prototype.send = jest.genMockFn();

const Resource = require('../../src/resource/resource').default;
const Response = require('../../src/http/response').default;

import Link from '../../src/resource/link';

describe('Resource', () => {
  beforeEach(() => {
    Http.prototype.send.mockClear();
  });

  describe('hydrate()', () => {
    it('should hydrate the simple properties', () => {
      var resource = new Resource();
      resource.hydrate({foo: 1, bar: 'none'});

      expect(resource.foo).toBe(1);
      expect(resource.bar).toBe('none');
    });

    it('should hydrate embedded resources', () => {
      var resource = new Resource(),
        embedded = {colors: [{name: 'red'}]};
      resource.hydrate({_embedded: embedded});

      expect(resource._embedded).toBeUndefined();
      expect(Object.keys(resource.embeddedResources)).toContain('colors');
      expect(resource.embeddedResources.colors.length).toEqual(1);
      expect(resource.embeddedResources.colors[0]).toEqual(jasmine.any(Resource));
      expect(resource.embeddedResources.colors[0].name).toBe('red');
    });

    it('should hydrate links', () => {
      var resource = new Resource(),
        links = {self: {href: 'me.com'}};

      resource.hydrate({_links: links});

      expect(resource._links).toBeUndefined();
      expect(resource.internalHalLinks).toEqual(links);
    });
  });

  describe('getLink()', () => {
    it('should retrieve the link by name', () => {
      var resource = new Resource(),
        links = {self: {href: 'me.com'}};

      resource.hydrate({_links: links});

      expect(resource.getLink('self')).toEqual(jasmine.any(Link));
      expect(resource.getLink('self')).toEqual(links.self);
    });

    it('should return undefined if the link doesn\'t exist', () => {
      var resource = new Resource({self: {href: 'me.com'}});
      expect(resource.getLink('foobar')).toBeUndefined();
    });
  });

  describe('embedded retrieval', () => {
    it('should return a single, hydrated resource when configured', () => {
      var resource = new Resource();
      resource.hasOne('home', {class: Resource});
      resource.hydrate({_embedded: {home: [{color: 'blue'}]}});

      expect(resource.home()).toEqual(jasmine.any(Resource));
    });

    it('should return a collection of hydrated resources when configured', () => {
      var resource = new Resource();
      resource.hasMany('homies', {class: Resource});
      resource.hydrate({_embedded: {homies: [{name: 'Clark'}, {name: 'Pineapple Face'}]}});

      expect(resource.homies()).toEqual(jasmine.any(Array));
      expect(resource.homies().length).toBe(2);

      resource.homies().forEach((homie) => {
        expect(homie).toEqual(jasmine.any(Resource));
      });

    });

    it('should use an optional relationship name', () => {
      var resource = new Resource();
      resource.hasOne('home', {class: Resource, accessor: 'homeTown'});
      resource.hydrate({_embedded: {home: [{color: 'blue'}]}});

      expect(resource.homeTown()).toEqual(jasmine.any(Resource));
    });
  });

  describe('update()', () => {
    it('should patch the data', () => {
      let promise = new Promise((resolve, reject) => {
        resolve(new Response(200, '{"name": "Jim"}'))
      });

      Http.prototype.send.mockReturnValueOnce(promise);

      Resource.url = 'http://foo.com/{id}';
      let resource = new Resource({id: 1000, name: 'Jim'});
      resource.update();

      let request = Http.prototype.send.mock.calls[0][0];
      expect(request.url).toEqual('http://foo.com/1000');
      expect(request.content).toEqual('{"id":1000,"name":"Jim"}');
    });
  });

  describe('replace()', () => {
    it('should put the data', () => {
      let promise = new Promise((resolve, reject) => {
        resolve(new Response(200, '{"id": 1000, "name": "Jim"}'))
      });

      Http.prototype.send.mockReturnValueOnce(promise);

      Resource.url = 'http://foo.com/{id}';
      let resource = new Resource({id: 1000, name: 'Jim'});
      resource.replace();

      let request = Http.prototype.send.mock.calls[0][0];
      expect(request.url).toEqual('http://foo.com/1000');
      expect(request.content).toEqual('{"id":1000,"name":"Jim"}');
    });
  });

  describe('delete()', () => {
    it('should delete the data', () => {
      let promise = new Promise((resolve, reject) => {
        resolve(new Response(204))
      });

      Http.prototype.send.mockReturnValueOnce(promise);

      Resource.url = 'http://foo.com/{id}';
      let resource = new Resource({id: 1000, name: 'Jim'});
      resource.delete();

      let request = Http.prototype.send.mock.calls[0][0];
      expect(request.url).toEqual('http://foo.com/1000');
      expect(request.content).toBeUndefined();
    });
  });

  describe('static get()', () => {
    pit('should return a hydrated instance', () => {
      let promise = new Promise((resolve, reject) => {
        resolve(new Response(200, '{"name": "bob"}'))
      });

      Http.prototype.send.mockReturnValueOnce(promise);

      Resource.url = 'http://foo.com/{id}';
      return Resource.get({id: 5}).then((resource) => {
        expect(resource).toEqual(jasmine.any(Resource));
        expect(resource.name).toBe('bob');
      });
    });
  });

  describe('static create()', () => {
    pit('should post to the resource URL and return a hydrated instance', () => {
      let promise = new Promise((resolve, reject) => {
        resolve(new Response(201, '{"id": 200, "name": "bob"}'))
      });

      Http.prototype.send.mockReturnValueOnce(promise);

      Resource.url = 'http://foo.com/resource';
      let responsePromise = Resource.create({name: 'bob'}).then((resource) => {
        expect(resource).toEqual(jasmine.any(Resource));
        expect(resource.id).toBe(200);
        expect(resource.name).toBe('bob');
      });

      let request = Http.prototype.send.mock.calls[0][0];
      expect(request.url).toEqual('http://foo.com/resource');
      expect(request.content).toEqual('{"name":"bob"}');

      return responsePromise;
    });
  });
});
