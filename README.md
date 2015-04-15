formidable
==========

An asynchronous static site generator for Node.js built on the
<a href="http://paularmstrong.github.io/swig/" target="_blank">__Swig__</a> templating engine and
<a href="https://github.com/kriskowal/q" target="_blank">__Q__ promises</a>. With a simple, yet
powerful MVT design inspired by Python's
<a href="https://www.djangoproject.com/" target="_blank">__Django__</a> web framework,
__formidable__ consistently handles site generation from both static and dynamic content sources.

### Getting started

You can install __formidable__ with npm:

```bash
npm install rw-formidable
```

Your project can be organized with almost any kind of directory structure, but you must have
separate directories for your source files and for the generated site. Either directory should
not be the parent of the other. By default, __formidable__ assumes a directory named `src` for
source files and `build` for the generated site.

The first ingredient in a __formidable__ project is a URLs definition. The build process is driven
by a top-level URLs definition module, typically named `urls.js` and located in the root of the
source directory. It should export an array of URL patterns defined with `formidable/urls.url()`:

```javascript
// src/urls.js
'use strict';

var url = require('rw-formidable/urls').url;

module.exports = [
    url('/', 'pages/views/home', 'pages:home')
];
```

Here, we've created a URL for the homepage which will load the `pages/views/home` module to
control the generated output for the `/` URL. Let's flesh out the view definition:

```javascript
// src/pages/views/home.js
'use strict';

var context = require('rw-formidable/context');

module.exports = {
    template: 'pages/home.html',
    context: context({
        greeting: 'Hello',
        name: 'World'
    })
};
```

Here, we've filled out the configuration that __formidable__ will use to generate a page for the
`/` URL. It specifies the template file that __swig__ should use to render the output and the
context data that will be used by the template.

Now, we can write the template for the homepage:

```django
{# src/pages/templates/pages/home.html #}
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <meta charset="UTF-8">
        <title>Welcome</title>
    </head>
    <body>
        <h1>{{ greeeting }}, {{ name }}!</h1>
    </body>
</html>
```

Finally, we can generate our site by running __node__ from the root of the project and entering:

```javascript
require('rw-formidable/settings').configure('example-1').load({})();
```

This will create the build directory with our generated homepage:

```html
<!-- buid/index.html -->
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <meta charset="UTF-8">
        <title>Welcome</title>
    </head>
    <body>
        <h1>Hello, World!</h1>
    </body>
</html>
```

Congratulations, you've built (or have imagined building) your first __formidable__ site!
You should note that the `{{ greeting }}` and `{{ name }}` expressions in the homepage template
have been replaced by their context values defined in the view. This merely hints at the underlying
power of __swig__.

### Building up

So far, we've had to create three different files to generate one HTML file. Fear not, the
URL-driven architecture will pay off immensely as you build up your site and maintain it over time.
We'll continue building up by first coaxing more horsepower out of __swig__. It would be quite
unpleasant to repeat the HTML skeleton structure in all of our templates, so we'll create
a base template from which our other templates will inherit:

```django
{# src/pages/templates/base.html #}
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <meta charset="UTF-8">
        <title>{% block title %}Welcome{% endblock %}</title>
    </head>
    <body>
        {% block content %}{% endblock %}
    </body>
</html>
```

Now, we can change our homepage template to:

```django
{# src/pages/templates/pages/home.html #}
{% extends 'base.html' %}

{% block content %}
    {{ greeting }}, {{ name }}!
{% endblock %}
```

Our new homepage inherits from the base template using the `{% extends %}` __swig__ tag. It
overrides the block named `content` from the base template using the `{% block %}` tag and
generates its content from the context variables defined in the view, just like the original
homepage template.

Next, we'll add some articles to our site. We'll need new URLs definitions, so let's modify
our `urls.js` file:

```javascript
// src/urls.js
'use strict';

var urls = require('rw-formidable/urls'),
    url = urls.url,
    include = urls.include;

module.exports = [
    url('/', 'pages/views/home', 'pages:home'),
    url('/articles', include('articles/urls'))
];
```

Here, we haven't quite finished creating new URLs definitions. By using
`formidable/urls.include()`, we've simply specified that URLs starting with `/articles` should be
handled by another URLs module located in `articles/urls`:

```javascript
// src/articles/urls.js
'use strict';

var url = require('rw-formidable/urls').url;

module.exports = [
    url('/', 'articles/views/index', 'articles:index'),
    url('/:slug/', 'articles/views/detail', 'articles:detail')
];
```

Now, we have the full URL for the articles index page, `/articles/`. Its view will be defined in the
`articles/views/index` module. We also have a _parameterized URL_, `/articles/:slug/` that will
have its `:slug` parameter filled out by the views defined in `articles/views/detail`. The articles
index page isn't very interesting, as it is basically the same as the homepage, so let's take a
look at the views for the article detail pages first:

```javascript
// src/articles/views/detail.js
'use strict';

var context = require('rw-formidable/context');

module.exports = [
    {
        template: 'articles/detail.html',
        params: {slug: 'getting-started'},
        context: context({
            title: 'Getting Started',
            content: 'You can install formidable with npm...'
        })
    },
    {
        template: 'articles/detail.html',
        params: {slug: 'building-up'},
        context: context({
            title: 'Building Up',
            content: 'So far, we\'ve had to create three different files...'
        })
    }
];
```

Here, we've exported two views. They each include an additional `params` property which in turn
specify the `slug` value to use for the `:slug` parameter in the URL. When we build the project
with __formidable__, it will generate pages for the URLs `/articles/getting-started/` and
`/articles/building-up/`, but first we need to create the article detail page template:

```django
{# src/articles/templates/articles/detail.html #}
{% extends 'base.html' %}

{% block title %}{{ title }}{% endblock %}

{% block content %}
    <h1>{{ title }}</h1>
    <p>{{ content }}</p>
{% endblock %}
```

Now, let's flesh out the articles index page and include some links to our new articles. We'll
define the view:

```javascript
// src/articles/views/index.js
'use strict';

var context = require('rw-formidable/context');

module.exports = {
    template: 'articles/index.html',
    context: context({
        title: 'Latest Articles',
        articles: [
            {
                title: 'Getting Started',
                slug: 'getting-started'
            },
            {
                title: 'Building Up',
                slug: 'building-up'
            }
        ]
    })
};
```

Lastly, create the template:

```django
{# src/articles/templates/articles/index.html #}
{% extends 'base.html' %}

{% block title %}{{ title }}{% endblock %}

{% block content %}
    <h1>{{ title }}</h1>
    <ul>
    {% for article in articles %}
        <li>
            <a href="{% url 'articles:detail' slug=article.slug %}">
                {{ article.title }}
            </a>
        </li>
    {% endfor %}
    </ul>
{% endblock %}
```

Here, we finally see the purpose for those mysterious third arguments passed to `url()`. Using
the `{% url %}` __swig__ tag, we can automatically generate the URL for any page in our site.
This feature is invaluable for long-term maintenance. Imagine that we have thousands of articles
with links pointing to them from all over the source code. If we need to change the articles' URL
paths from `/articles` to `/posts`, we would have a daunting problem in trying to find and replace
all of the potentially broken links. By using the `{% url %}` tag, we can simply change the
URLs definition in the root `urls.js` module from `url('/articles', ...)` to `url('/posts', ...)`,
and __formidable__ will take care of the rest.

We can now generate our site by running __node__ from the root of the project and entering:

```javascript
require('rw-formidable/settings').configure('example-2').load({})();
```

### Growing up

Clearly, it's not very practical to define HTML content inside of JavaScript strings buried in
module files, and that's certainly not the way __formidable__ was designed to be used. On
the contrary — you have the full power of __node__ inside of your modules, which you can
use to load and process context data from nearly any source imaginable to dynamically generate
static pages. With a little bit of __node__ programming, you can use __formidable__ to generate
large, complex static sites.

As an example, we'll riff on <a href="http://assemble.io/" target="_blank">__Assemble__</a>, a
popular static site generator that you may have seen or even used before. Of course, we'll be using
__swig__ instead of __Assemble__'s default template engine,
<a href="http://handlebarsjs.com/" target="_blank">__handlebars__</a>. We'll write a fancy
`views/page.js` module that reads hybrid YAML/__swig__ template files from anywhere under the
source directory, excluding the `templates` directory (where we'll keep our base templates),
to automatically generate our site. We'll need to install
<a href="https://www.npmjs.org/package/js-yaml" target="_blank">__js-yaml__</a> to pull off this
little stunt:

```bash
npm install js-yaml
```

The basic idea is to find and read all of the template files, split the YAML code from
the __swig__ template code, use the YAML code to generate context data, then finally render the
context data using the __swig__ template code. The files will be assigned URLs that reflect
their structure in the source directory. Here's the `urls.js` module:

```javascript
// src/urls.js
'use strict';

var urls = require('rw-formidable/urls'),
    url = urls.url,
    include = urls.include;

module.exports = [
    url('/:url', 'views/page', 'page')
];
```

And here's the `views/page.js` module:

```javascript
// src/views/page.js
'use strict';

var path = require('path'),
    yaml = require('js-yaml'),
    formidable = require('rw-formidable'),
    swig = require('rw-formidable/template').engine,
    context = require('rw-formidable/context'),
    utils = require('rw-formidable/utils'),
    fs = utils.fs,
    glob = utils.glob,
    q = utils.q,
    // The source file path.
    root = path.resolve(formidable.path.root());

module.exports = (
    (glob('**/*.html', {cwd: root})
    .then(function(urls) {
        return q.all(
            urls
                .filter(function(url) {
                    return !/^templates\/.*$/.test(url);
                })
                .map(function(url) {
                    return (
                        fs.read(path.join(root, url))
                        .then(function(code) {
                            var parts = (
                                    code
                                        .split(/^----*\s*$/gm)
                                        .filter(function(part) {
                                            return !!part.trim();
                                        })),
                                template = (parts[1] || parts[0] || '').trim(),
                                data = parts[1] ? yaml.load(parts[0]) : {};

                            return {
                                params: {
                                    url: (
                                        path.basename(url) === 'index.html' ?
                                            path.dirname(url) + path.sep :
                                            url)
                                },
                                context: context(data),
                                template: function(context) {
                                    return swig.render(template, {
                                        filename: url,
                                        locals: context
                                    });
                                }
                            };
                        }));
                }));
    })));
```

Here, we start to see some more of __formidable__'s capabilities. The `glob` utility, built on top
of the awesome <a href="https://www.npmjs.org/package/glob" target="_blank">__glob__</a> library,
returns a promise whose results are processed through a series of transformations using the
<a href="https://www.npmjs.org/package/q" target="_blank">__Q__</a> and
<a href="https://www.npmjs.org/package/q-io" target="_blank">__Q-IO__</a>`/fs` utilties along
the way. The promise finally resolves into an array of view objects that specify `params.url` based
on the file path from __glob__, `context` from the parsed YAML data in the loaded file and a
`template` function that uses __swig__ to render the parsed template from the loaded file using the
context data.

Now, we can rebuild the site from the first example. Let's start with the base template:

```django
{# src/templates/base.html #}
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <meta charset="UTF-8">
        <title>{% block title %}{{ title|default('Welcome') }}{% endblock %}</title>
    </head>
    <body>
        {% block content %}{% endblock %}
    </body>
</html>
```

Now, we can build the homepage:

```django
# src/index.html
greeting: Hello
name: World
---
{% extends 'base.html' %}

{% block content %}
    {{ greeting }}, {{ name }}!
{% endblock %}
```

And the article detail pages:

```django
# src/articles/getting-started/index.html
title: Getting Started
---
{% extends 'base.html' %}

{% block content %}
    <h1>{{ title }}</h1>
    <p>You can install formidable with npm...</p>
{% endblock %}
```

```django
# src/articles/building-up/index.html
title: Building Up
---
{% extends 'base.html' %}

{% block content %}
    <h1>{{ title }}</h1>
    <p>So far, we've had to create three different files...</p>
{% endblock %}
```

And of course, the article index page:

```django
# src/articles/index.html
title: Latest Articles
articles:
- title: Getting Started
  url: 'articles/getting-started/'
- title: Building Up
  url: 'articles/building-up/'
---
{% extends 'base.html' %}

{% block content %}
    <h1>{{ title }}</h1>
    <ul>
    {% for article in articles %}
        <li>
            <a href="{% url 'page' url=article.url %}">
                {{ article.title }}
            </a>
        </li>
    {% endfor %}
    </ul>
{% endblock %}
```

Again, we can build our site by running __node__ from the root of the project and entering:

```javascript
require('rw-formidable/settings').configure('example-3').load({})();
```

Ironically, __formidable__ was built to free a site's URL structure from its source file structure
and to provide a way to generate pages dynamically without requiring a one-to-one mapping to
source files. This example imposes exactly those limitations, but its purpose is to demonstrate in
fifty lines of code that __formidable__ operates at a higher level of abstraction. In other words,
its capabilites are a superset of static site generators with such strict and
inflexible architectures.

### How does it work?

You may be wondering how __formidable__ finds your JavaScript modules. Normally, you cannot call
`require()` to load a local module in your project unless you use explicit dotted paths, e.g.
`require('./articles/views/detail')`. However, __formidable__ allows you to avoid the dotted path
syntax by building a full path to your modules with respect to the source directory, `src`
by default.

You may also be wondering how it finds your template files during the build process. By default,
__formidable__ searches for any directories under your source directory with the name
`templates`. As an example, we tell __formidable__ to use the `articles/detail.html` template
in the `articles/views/detail` views module. It then finds the template in
`src/articles/templates/articles/detail.html`, i.e. `articles/detail.html` with respect to a
directory named `templates`, namely `src/articles/templates`.

The reason we've nested yet another `articles` directory under `src/articles/templates` is for
namespacing. Had we only named the template `detail.html` and not `articles/detail.html`, we
wouldn't be able to use `detail.html` for any other template in our project (technically we could,
but with unpredictable results). Alternatively, we could have named our template file
`articles-detail.html` or `article-detail.html` and avoided the intermeditate `articles` directory.
The strategy you choose for namespacing is simply a matter of taste and your own aesthetics. For
best results, pick a style and stick to it.

### Changing settings

You may not want to use `src` as the name for your source files and `build` as the name for the
generated site. You also may want to configure __formidable__ to find templates under a different
file path pattern. To change these settings, you'll need to add some properties to the object
passed to `load()` before you run the resulting function:

```javascript
require('rw-formidable/settings').configure('your-project').load({
    // The source files.
    root: 'src',
    // The build files.
    build: 'build',
    // A glob pattern or array of glob patterns for the template directories that
    // formidable will search to find our template files.
    templates: '**/templates'
})();
```

Here, we've created and run a __formidable__ instance with settings that happen to be the same
as the defaults. Several other settings are available but are currently undocumented. Please
browse the source code if you want to discover more possibilities.

The way in which we've run the build has so far been a bit awkward. The `'example-N'`
argument that we've been passing to `configure()` seems pointless. It can be used instead to
specify a `require()`-able path to a settings module that exports the settings object we would
normally pass to `load()`. To repeat the above example using this feature, we would create a
`settings.js` file at the root of the project, i.e. in the parent directory of `src` and `build`:

```javascript
// settings.js
'use strict';

module.exports = {
    root: 'src',
    build: 'build',
    templates: '**/templates'
};
```

Now we can run the build like so (by running __node__ from the root of the project):

```javascript
require('rw-formidable/settings').configure('./settings');
require('rw-formidable')();
```

This is better, but still not ideal. Out of the box, __formidable__ does not provide a command-line
interface, but rather assumes that you'll be using a build tool like
<a href="http://gruntjs.com/" target="_blank">__Grunt__</a> that hides away most of these details.
If You want to use __Grunt__, check out
<a href="https://github.com/republicwireless-open/grunt-formidable" target="_blank">__grunt-formidable__</a>,
__formidable__'s official __Grunt__ plugin for details.

### Learn more

We've tried to design __formidable__'s core features to be simple enough for you to start
building websites within mintues. However, the underlying tools like __swig__ and __Q__ may be
unfamiliar. To most effectively use __formidable__, you'll need a decent understanding of these
tools:

* <a href="http://paularmstrong.github.io/swig/" target="_blank">__Swig__</a>, the templating engine
* <a href="http://documentup.com/kriskowal/q/" target="_blank">__Q__</a>, the promise library
* <a href="http://documentup.com/kriskowal/q-io" target="_blank">__Q-IO__</a>, the file system and
    HTTP library
* <a href="https://github.com/isaacs/node-glob" target="_blank">__glob__</a>, the file
    searching library
