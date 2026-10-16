// Behaviour for style.css (from sameersaurav.github.io).
// Load at the end of <body>:  <script src="site.js"></script>
(function(){
  document.documentElement.classList.add('js');

  // scroll reveal: elements with .reveal fade in once visible
  const reveals = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){
    reveals.forEach(el=>el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{threshold:.12});
  reveals.forEach(el=>io.observe(el));

  // active nav link: highlight the link whose #section is in the middle of the screen
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const map = {};
  links.forEach(l=>{ const id=l.getAttribute('href').slice(1); if(document.getElementById(id)) map[id]=l; });
  const navIO = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting && map[e.target.id]){
        links.forEach(l=>l.classList.remove('active'));
        map[e.target.id].classList.add('active');
      }
    });
  },{rootMargin:'-45% 0px -50% 0px'});
  document.querySelectorAll('section.block').forEach(s=>navIO.observe(s));
})();
