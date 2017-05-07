---
layout: default
---

<section>
	<h1>Introduction<h1>
	<p>Welcome! This is the page I will be using as a blog for my <a href="https://www.gnome.org/outreachy/" target="_blank">Outreachy</a> web development internship with <a href="http://mozilla.org" target="_blank">Mozilla</a> between May and August 2017.</p>
	<h2>What I am working on</h2>
	<p>Re-designing and re-implementing the Firefox add-on [Lightbeam](https://addons.mozilla.org/en-US/firefox/addon/lightbeam/) as a WebExtension. The repository can be found [here](https://github.com/pauljt/lightbeam-we).</p>
	<img src="http://biancadanforth.com/images/lightbeam-gather-information.png" alt="The soon to be old version of Lightbeam">
</section>

<div class="posts">
  {% for post in site.posts %}
    <article class="post">

      <h1><a href="{{ site.baseurl }}{{ post.url }}">{{ post.title }}</a></h1>

      <div class="entry">
        {{ post.excerpt }}
      </div>

      <a href="{{ site.baseurl }}{{ post.url }}" class="read-more">Read More</a>
    </article>
  {% endfor %}
</div>