---
layout: default
title: Notes on Adtech & Systems
---

<h2>Journal</h2>

<ul>
{% for post in site.posts %}
  <li><em>{{ post.date | date: "%B %e, %Y" }}</em> &mdash; <a href="{{ post.url }}">{{ post.title }}</a></li>
{% endfor %}
</ul>