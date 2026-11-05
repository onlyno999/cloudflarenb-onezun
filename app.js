(function () {
      var buttons = document.querySelectorAll('.filter-btn');
      var cards = document.querySelectorAll('.tip-card');
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          buttons.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          var cat = btn.getAttribute('data-cat');
          cards.forEach(function (card) {
            if (cat === 'all' || card.getAttribute('data-cat') === cat) {
              card.style.display = '';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });
    })();
