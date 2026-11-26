'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { hasExpectedMenu } = require('../scripts/sync-site-navigation.cjs');

const validDifferentFormatting = `
<nav aria-label='Основная навигация' id='nav'>
  <ul class='links'>
    <li><a href='/#services'>Услуги</a></li>
    <li><a href='/#why-us'>Почему мы</a></li>
    <li><a href='/#portfolio'>Портфолио</a></li>
    <li class='active'><a href='/blog/blog.html'>Статьи</a></li>
    <li><a href='/spravochnik/'>Справочник</a></li>
    <li><a href='/#contact'>Контакты</a></li>
  </ul>
  <ul class='icons'>
    <li><a class='icon solid fa-phone' href='tel:+74956446654'><span class='label'>Телефон</span></a></li>
    <li><a href='https://wa.me/79856446654' class='icon brands fa-whatsapp'><span class='label'>WhatsApp</span></a></li>
    <li><a href='https://t.me/desertocean' class='icon brands fa-telegram-plane'><span class='label'>Telegram</span></a></li>
  </ul>
</nav>`;

test('semantic navigation is valid despite formatting and attribute-order differences', () => {
  assert.equal(hasExpectedMenu('articles/example.html', validDifferentFormatting), true);
});

test('navigation contract rejects an incorrect URL or item order', () => {
  const wrongUrl = validDifferentFormatting.replace('/blog/blog.html', '/#articles');
  const placeholder = '__NAV_SWAP__';
  const wrongOrder = validDifferentFormatting
    .replace("href='/#why-us'", `href='${placeholder}'`)
    .replace("href='/#portfolio'", "href='/#why-us'")
    .replace(`href='${placeholder}'`, "href='/#portfolio'");

  assert.equal(hasExpectedMenu('articles/example.html', wrongUrl), false);
  assert.equal(hasExpectedMenu('articles/example.html', wrongOrder), false);
});

test('navigation contract strictly checks contact links and their labels', () => {
  const wrongContact = validDifferentFormatting.replace('https://wa.me/79856446654', 'https://wa.me/70000000000');
  const wrongLabel = validDifferentFormatting.replace('Telegram</span>', 'Мессенджер</span>');

  assert.equal(hasExpectedMenu('articles/example.html', wrongContact), false);
  assert.equal(hasExpectedMenu('articles/example.html', wrongLabel), false);
});
