formidable
==========

An asynchronous static site generator for Node.js built on the
<a href="http://paularmstrong.github.io/swig/" target="_blank">__swig__</a> templating engine and
<a href="https://github.com/kriskowal/q" target="_blank">__q__ promises</a>. With a simple, yet
powerful MVT design inspired by Python's
<a href="https://www.djangoproject.com/" target="_blank">__Django__</a> web framework,
__formidable__ consistently handles site generation from both static and dynamic content sources.

### Getting started

You can install __formidable__ with npm:

```bash
npm install formidable
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

var url = require('formidable/urls').url;

module.exports = [
    url('/', 'pages/views/home', 'pages:home')
];
```

Here, we've created a URL for the homepage which will load the `pages/views/home` module to
control the generated output for the `/` URL. Let's flesh out the view definition:

```javascript
// src/pages/views/home.js
'use strict';

var context = require('formidable/context');

module.exports = {
    template: 'pages/home.html',
    context: context({
        greeting: 'Hello',
        subject: 'World'
    })
};
```

Here, we've filled out the configuration that __formidable__ will use to generate a page for the
`/` URL. It specifies the template that __swig__ should use to render the output and the context
data that will be used by the template.

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
        <h1>{{ greeeting }}, {{ subject }}!</h1>
    </body>
</html>
```

Finally, we can generate our site by running a little script in __node__ from the root of
the project:

```javascript
var formidable = require('formidable/settings').configure('hello-world').load({});
formidable();
```

Running `formidable()` will create the build directory with our generated homepage:

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

Congratulations, you've built (or have imagined building) your first __formidable__ site.
You should note that the `{{ greeting }}` and `{{ subject }}` expressions in the homepage template
have been replaced by their context values defined in the view. This merely hints at the underlying
power of __swig__.

### Building up

So far, we've had to create three different files to generate one HTML file. Fear not, the
URL-driven architecture will pay off immensely as you build up your site and maintain it over time.
We'll continue building up by first coaxing more horsepower out of __swig__. It would be quite
unpleasant to repeat the HTML skeleton structure in all of our site's templates, so we'll create
a base template from which other templates will inherit:

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
    {{ greeting }}, {{ subject }}!
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

var urls = require('formidable/urls'),
    url = urls.url,
    include = urls.include;

module.exports = [
    url('/', 'pages/views/home', 'pages:home'),
    url('/articles', include('articles/urls'))
];
```

Here, we haven't quite finished creating new URLs definitions. By using
`formidable/urls.include()`, we've simply specified that URLs starting with `/articles` should be
to another URLs module located in `articles/urls`:

```javascript
// src/articles/urls.js
'use strict';

var url = require('formidable/urls').url;

module.exports = [
    url('/', 'articles/views/index', 'articles:index'),
    url('/:slug/', 'articles/views/detail', 'articles:detail')
];
```

Now, we have a full URL for the articles index page, `/articles/`. Its view will be defined in the
`articles/views/index` module. We also have a _parameterized URL_, `/articles/:slug/` that will
have its `:slug` parameter filled out by the views defined in `articles/views/detail`. The articles
index page isn't very interesting, as it is set up basically the same way as the homepage, so
let's take a look at the views for the article detail pages first:

```javascript
// src/articles/views/detail.js
'use strict';

var context = require('formidable/context');

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
        template: 'aticles/detail.html',
        params: {slug: 'building-up'},
        context: context({
            title: 'Building Up',
            content: 'So far, we\'ve had to create three different files...'
        })
    }
];
```

Here, we've exported two views. They each include an additional `params` property which in turn
specify the `slug` value to use for `:slug` parameter in the URL. When we build the project with
__formidable__, it will generate pages for the URLs `/articles/getting-started/` and
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

At this point, we can't generate the site yet, because we haven't created the
`articles/views/index` module, so let's comment out the `url()` call in `articles/urls` that
references the missing module. Then, we can run `formidable()` in __node__ and check out our
new articles. They should look like (but with somewhat different indentation):

```html
<!-- build/articles/getting-started/index.html -->
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <meta charset="UTF-8">
        <title>Getting Started</title>
    </head>
    <body>
        <h1>Getting Started</h1>
        <p>You can install formidable with npm...</p>
    </body>
</html>
```

```html
<!-- build/articles/building-up/index.html -->
<!DOCTYPE html>
<html lang="en-us">
    <head>
        <meta charset="UTF-8">
        <title>Building Up</title>
    </head>
    <body>
        <h1>Building Up</h1>
        <p>So far, we've had to create three different files...</p>
    </body>
</html>
```

Finally, let's flesh out the articles index page and include some links to our new articles.
Start by uncommenting the `url()` call from above. Then, define the view:

```javascript
// src/articles/views/index.js
'use strict';

var context = require('formidable/context');

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

### Growing up

Clearly, it's not very practical to define HTML content inside of JavaScript strings buried in
module files, and that's certainly not the way __formidable__ was designed to be used. On
the contrary &emdash; you have the full power of __node__ inside of your modules, which you can
use to load and process context data from nearly any source imaginable to dynamically generate
static pages. With a little bit of __node__ programming, you can use __formidable__ to generate
huge and complex static sites.

As an example, we'll riff off of <a href="http://assemble.io/" target="_blank">__Assemble__</a>, a
great static site generator that you may have seen or even used before. Of course, we'll be using
__swig__ instead of __Assemble__'s default template engine,
<a href="http://handlebarsjs.com/" target="_blank">__handlebars__</a>. We'll write a fancy
`urls.js` module that reads hybrid YAML/__swig__ template files from anywhere under the
source directory to automatically generate our site. We'll need to install
<a href="https://www.npmjs.org/package/lodash" target="_blank">__lodash__</a> and
<a href="https://www.npmjs.org/package/js-yaml" target="_blank">__js-yaml__</a> to pull off this
little stunt:

```bash
npm install js-yaml
npm install lodash
```

The basic idea is that we'll find and read all of the template files, split the YAML data from
the __swig__ template code, use the YAML to generate context data and render the context data
with the __swig__ template code. The files will be assigned URLs that reflect their structure in
the source directory.

```javascript
// src/urls.js
'use strict';

var _ = require('lodash'),
    path = require('path'),
    yaml = require('js-yaml'),
    formidable = require('formidable'),
    swig = require('formidable/template').engine,
    url = require('formidable/urls').url,
    context = require('formidable/context'),
    utils = require('formidable/utils'),
    fs = utils.fs,
    glob = utils.glob,
    q = utils.q,
    // The source file path.
    root = path.resolve(formidable.path.root());

module.exports = [
    url(
        '/:url',
        (glob('**/*.html', {cwd: root})
        .then(function(urls) {
            return q.all(
                urls.map(function(url) {
                    return (
                        fs.read(path.join(root, url))
                        .then(function(code) {
                            var parts = (
                                    code
                                        .split(/^----*\s*$/gm)
                                        .filter(function(part) {
                                            return !!part.trim();
                                        })),
                                data = yaml.load(parts[0]),
                                template = parts[1];

                            return {
                                params: {url: url},
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
        })),
        'page')
];
```

Here, we've demonstrated several other __formidable__ capabilities. To start, we've returned a
promise for the second argument to `url()`. The `glob` utility, built on top of the awesome
<a href="https://www.npmjs.org/package/glob" target="_blank">__glob__</a> library, returns a
promise whose results are passed through a chain of more promises using the
<a href="https://www.npmjs.org/package/q" target="_blank">__q__</a> and
<a href="https://www.npmjs.org/package/q-io" target="_blank">__q-io__</a>`/fs` utilties along
the way. The promise finally resolves into an array of view objects that specify `params.url` based
on the file path from __glob__, `context` from the parsed YAML data in the loaded file and a
`template` function that uses __swig__ to render the context into the parsed template from the
loaded file.

Now, we can rebuild the site from the first example. Let's start with the base template:

```django
{# src/base.html #}
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
subject: World
---
{% extends 'base.html' %}

{% block content %}
    {{ greeting }}, {{ subject }}!
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

Finally, article index page:

```django
# src/articles/index.html
title: Latest Articles
articles:
- title: Getting Started
  url: '/articles/getting-started/'
- title: Building Up
  url: '/articles/building-up/'
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

Finally, we'll need to tweak __formidable__'s config slightly when we run it in __node__ to
tell it where to search for template filenames encountered in `{% extends %}` tags:

```javascript
var formidable = require('formidable/settings').configure('hello-world').load({
        templates: '**/*.html'
    });
formidable();
```

Ironically, __formidable__ was built to free the generated site's URL structure from the source
file structure and to provide a way to generate pages dynamically without requiring a one-to-one
mapping to source files. The purpose of this example is to demonstrate in fifty lines of code that
__formidable__'s capabilites are a superset of static site generators with such strict and
inflexible architectures.

### What next?

* An explanation of how modules are found, since they're not `require()`able
* Why templates in the first example have such long paths, i.e. suggested project layout
* Reference
* Links to resources (swig, q, q-io/fs, glob, etc.)
