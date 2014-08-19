formidable
==========

An asynchronous static site generator for Node.js using the
<a href="http://paularmstrong.github.io/swig/" target="_blank">swig</a> template engine and
<a href="https://github.com/kriskowal/q" target="_blank">q promises</a>. With a modest, yet
powerful MVC design (actually MVT) inspired by Python's
<a href="https://www.djangoproject.com/" target="_blank">Django</a>, *formidable*
consistently handles site generation from both static and dynamic content sources.

## Get started

You can install *formidable* from npm:

```bash
npm install formidable
```

### Get organized

You can organize your project with almost any kind of directory structure, but at a minimum,
you'll need one directory for source files and one for the built output. Either directory
may not be the parent of the other. By default, formidable assumes a directory named `src` for
the source and `build` for the build.

The rest of the project layout is up to you, but by following some simple guidelines, you'll be
well-armed to create projects that scale well as you grow your site.
[Read more](#suggested-project-layout) about *formidable*'s suggested product layout.

### Create a URL structure

The first ingredient to a *formidable* build is a URL structure. The build process is driven by a
top-level URLs configuration module, typically named `urls.js` located in the root of the source
directory. It should export an array of URL patterns defined with `formidable/urls.url()`. Partial
patterns that populate only the first part of the URL path may also be created
using `formidable/urls.include()`.

Each full URL pattern will reference another module that specifies the view(s) that will be
rendered for the URL pattern. Additionally, each full URL pattern is assigned a unique codename
that can be used to generate a URL from its codename and parameters using
`formidable/urls.resolve()` or the `{% url %}` template tag for swig.

As an example, a URLs module that defines a full URL pattern and a partial URL pattern might
look like:

```javascript
'use strict';

var urls = require('formidable/urls'),
    url = urls.url,
    include = urls.include;

module.exports = [
    url('/', 'pages/views/home', 'pages:home'),
    url('/articles', include('articles/urls'))
];
```

Here, the first `url()` call specifies that, for the URL `'/'`, the view defined in
`'pages/views/home'` should be used to generate the `index.html` output file in the build
directory. The third argument, `'pages:home'`, is the URL's codename. The codename can have
any format. The only requirement is that all codenames defined across all full URL patterns
are unique. The `:`-separated style is simply an example convention.

The second `url()` call specifies that, for a URL starting with `'/articles'`, the additional
URL pattern(s) defined in `'articles/urls'` should be appended to `'/articles'` to create the
full URL pattern(s). By convention, a partial URL prefix should not end in `'/'`. The
`url()` calls in the `include()`d URL pattern(s) will start with `'/'`. This way, the URL patterns
specified in all URLs modules will consistently begin with `'/'`, and you'll avoid creating URLs
with missing slashes or double slashes.

The `include()`d URLs module, `'articles/urls'` might look like:

```javascript
'use strict';

var url = require('formidable/urls').url;

module.exports = [
    url('/', 'articles/views/index', 'articles:index'),
    url('/:slug/', 'articles/views/detail', 'articles:detail')
];
```

Here, both `url()` calls are similar to the first call in the preceding example. However, the
second call specifies a parameterized URL pattern. Rather than having a hard-coded path, the
`':slug'` syntax specifies that the URL will be populated by its view with a parameter
named `'slug'`. The first `url()` call's view will generate the `articles/index.html` output
file in the build directory. The second `url()` call's view will generate any number of
files in the build directory with paths like `articles/<slug>/index.html`. If you need to create
an output file that isn't a directory path with `index.html` appeneded, simply include a file
extension at the end of the URL pattern, e.g. `'/404.html'` or `'/definitions.xml'`.

In both examples, the view modules and `include()`d URLs modules are similar to the module names
that you would pass to `require()`, except that they are relative to the root of the project's
source directory. This feature allows you to freely move URLs modules around without breaking
relative paths, as would be the case with a call like `require('./views/detail')`. Of course,
any file referencing a URLs module that has moved will need to be updated.

For simple views (more on these in a moment), you can alternatively pass an object or an array
of objects in place of a view module name. Of course, you can also `require()` a module
that exports an object or an array of objects. This shortcut syntax is convenient for the most
simple views, such as those that don't require a context to render. However, for large projects,
consistency and predictability are ususally more important than brevity, so establish stylistic
rules for when it's acceptable to use the shortcut syntax and stick to it.

Finally, with these defined URL patterns, we can resolve actual URLs. For the simple, hard-coded
paths, this feature seems trivial, but for parameterized paths, it's immediately useful. As an
example, we can generate and log the URL for an article with a slug of `'check-it-out'` like so:

```javascript
var resolve = require('formidable/urls').resolve;

console.log(resolve('articles:detail', {slug: 'check-it-out'}));
```

This will log the output `/articles/check-it-out/`. Another benefit of resolving actual URLs from
named URL patterns is that the patterns' paths can be freely changed without having to tediously
update hard-coded URLs that might be scattered throughout your codebase. It's especially difficult
to find and replace URLs that are generated manually like `'/articles/' + slug + '/'` in JavaScript
or like `/articles/{{ slug }}/` in a swig template. You won't need to change anything if you
use `resolve()` instead. Of course, if you do change URL patterns for a production site, you
should take care to create redirects in your server configuration or in your single page
app's router.

### Render data to templates with views

The second ingredient to the *formidable* build process is your project's views. Views link
data from any content source to a swig template that is used to generate an output file for a
particular URL. Views are simply modules that export a single object or an array of objects.
These objects must specify at least one property, `template` that names the swig template file
used to render the output file. If the template requires context data, a view object may specify
it under a `context` property. Finally, for paramterized URL patterns, such as the
`'/articles/:slug/'` example from above, a view object's `params` property must specify the
URL paramters that are used to generate the output file's path.

Most projects will require some common, base context data to be passed to all of its templates, so
*formidable* provides a means to configure the base context (more on this soon) and to
automatically extend it with `formidable/context()`. Additionally, *formidable* always passes
metadata about the template being built into the context. By default, it is passed under the
context property `meta`. In the metadata, you can retrieve the following properties:

* `template` the template that's being used to generate the output file
* `url` the resolved URL of the output file that's being generated
* `params` the parameters used to generate the resolved URL

Putting this together, the simple homepage view might look like:

```javascript
'use strict';

var context = require('formidable/context');

module.exports = {
    template: 'home.html',
    context: context({
        title: 'Welcome to our home',
        content: 'Thanks for visiting!'
    })
};
```

The more complex article detail views, which require parameters, might look like:

```javascript
'use strict';

var context = require('formidable/context');

module.exports = [
    {
        template: 'articles/detail.html',
        params: {
            slug: 'check-this-out'
        },
        context: {
            title: 'Check this out!',
            content: 'This is pretty cool...'
        }
    },
    {
        template: 'articles/detail.html',
        params: {
            slug: 'yet-another-article',
        },
        context: {
            title: 'Yet another article!',
            content: 'We are able to publish all the articles we want...'
        }
    }
];
```

The first homepage example is fairly self-explanatory. Coupled with the `urls.js` above, it will
generate `index.html` in the build directory. The articles example is only slightly more
complex because of the URL parameters. Coupled with `urls.js` and `articles/urls.js`, it will
generate `articles/check-this-out/index.html` and `articles/yet-another-article/index.html` in
the build directory.

In a view object, the `template` filenames are treated specially. *formidable* provides a way
to configure path globbing patterns for the base directory(ies) that it should use to locate
template files from the partial paths specified in views. The purpose of this feature is to avoid
typing long template pathnames and to allow templates to be moved around without having to
update view code.

For this example, let's suppose that `home.html` is located at `templates/home.html` in the
source directory, that `articles/detail.html` is located at `templates/articles/detail.html` in
the `articles` directory. The default globbing pattern is `**/templates`, so `home.html` will
correctly resolve to `templates/home.html` with respect to the source directory and
`articles/detail.html` will correctly resolve to `articles/templates/articles/detail.html` with
respect to the source directory.

Of course, these examples are so simple that we could have just loaded JSON data. Alternatively,
we could have inlined the view objects into the `urls.js` modules, as described above. However,
for non-trivial use, we have all the power of Node available to generate these view objects or
arrays of view objects. By adding the `q` promise library to the mix, we gain even more power
(more on this soon).

### Generate output files from templates

The third and final ingredient to the *formidable* build process is your project's templates.
Templates should be written for the
<a href="http://paularmstrong.github.io/swig/" target="_blank">swig</a> template engine.
In essence, the context data specified in a view object will be passed into the template where
properties can be accessed with a syntax like `{{ title }}`.

Swig has many powerful tools, including a flexible template inheritance feature. *formidable* is
best leveraged by having a mastery of swig templates, so take the time to study its features and
commit them to memory.

The swig instance used by *formidable* is pre-configured with a custom template loader that
implements the template locating feature described above. This means that tags like `{% extends %}`
and `{% include %}` will work with the same kind of template filepaths as those defined in
view objects.

The swig instance is also pre-configured with a custom `{% url %}` tag for resolving URL patterns
to actual URLs in templates. Usage for a simple URL like the homepage from above would be
`{% url 'pages:home' }`, which will resolve to `/`. A more complex URL like an article detail
from above would be `{% url 'articles:detail' slug='check-this-out' %}`, which will resolve
to `/articles/check-this-out/`.

### So how is this asyncrhonous?

For any non-trivial site, in order to generate context data for your templates, you likely need to
load some data from a web service or a database or from user input, etc. As these tasks are
generally asynchronous, *formidable* provides robust support for asynchronously loaded content.

All asynchronous activity in a *formidable* build is managed uniformly with the
<a href="https://github.com/kriskowal/q" target="_blank">q</a> promise library. All values needed
in a *formidable* build, except for some top-level configuration values (more on these soon),
may be `q` promises.

This means that a views module may export a `q` promise for an array, or an array of `q` promises,
or an array of view objects where the `template`, `params` and `context` properties are `q`
promises or a combination of all three. Other values, such as the exported array from an URLs
module may also be a `q` promise, or an array of `q` promises, etc. Unless otherwise noted, any
value in a *formidable* build can be a promise.

A typical usage of `q` in a views module might look like:

```javascript
'use strict';

var q = require('formidable').q, // or require('q') if installed locally
    http = require('http')
    done = q.defer(),
    request;

// Fetch some data from a web service and resolve the promise with
// the results.
request = http.request(/* ... */);
request.on('response', function(response) {
    response.on('end', function() {
        done.resolve(response.read());
    });
});

module.exports = done.promise;
```

To simplify things a bit, you can use the
<a href="https://github.com/kriskowal/q-io" target="_blank">q-io</a> library, which wraps
filesystem and HTTP operations with `q` promises. With `q-io`, we can eliminate the low-level
deferred object management, and our example becomes:

```javascript
'use strict';

var http = require('q-io/http');

module.exports = http.read(/* ... */);
```

### Tying it all together

<< settings-and-bootstrapping-stuff >>

### Suggested project layout

*formidable* aims to be flexible and to avoid imposing too much opinionated structure on your
projects. However, it does come packaged with sensible configuration defaults that assume a
particular project structure. By following some basic guidelines, your projects will stay
organized, even as they grow to hundreds of source files and many thousands of lines of code.

In your source directory, it's ususally best to organize files into separate application
directories. For example, if you want to build a news site, you might organize your project with
an `articles` directory for all of the news articles and a `pages` directory for the various
pages that flesh out the site and glue it together.

In each application directory, you should create a `urls.js` file that manages the URLs
captured by that application. It will be `include()`d  from the main `urls.js` file in the
root of the source directory.

Each application's `urls.js` file should reference view modules stored in a sibling `views`
directory. In turn, the views modules should reference templates stored in a `templates`
directory that's a sibling to `views`.

You should add an additional subdirectory to `templates`, usually named the same as the
application, e.g. `templates/articles`. This serves to namespace your templates so that you
don't create template name conflicts as you grow your site. Alternatively, you may want to create
a single `templates` directory in the root of the source directory that mirrors the application
directory structure inside of it. However in practice, and especially for large projects,
keeping templates packaged inside their applications alleviates the friction from hunting for
files in disparate directories during development. Additionally, packaging templates in a directory
creates an opportunity to build and distribute reusable applications.

Taken together, a very simple news site might have a project layout like:

```
build/
src/
    articles/
        templates/
            articles/
                index.html
                detail.html
        views/
            index.js
            detail.js
        urls.js
    pages/
        templates/
            pages/
                home.html
                contact.html
                page.html
        views/
            home.js
            contact.js
            page.js
        urls.js
    urls.js
```

The top-level URLs configuration in `src/urls.js` would look like:

```javascript
'use strict';

var urls = require('formidable/urls'),
    url = urls.url,
    include = urls.include;

module.exports = [
    url('', include('pages/urls')),
    url('/articles', include('articles/urls'))
];
```

The articles URLs configuration in `src/articles/urls.js` would look like:

```javascript
'use strict';

var url = require('formidable/urls').url;

module.exports = [
    url('/', 'articles/views/index', 'articles:index'),
    url('/:slug/', 'articles/views/detail', 'articles:detail')
];
```

Finally, the pages URLs configuration in `src/pages/urls.js` would look like:

```javascript
'use strict';

var url = require('formidable/urls').url;

module.exports = [
    url('/', 'pages/views/home', 'pages:home'),
    url('/contact/', 'pages/views/contact', 'pages:contact'),
    url('/:path/', 'pages/views/page', 'pages:page')
];
```
