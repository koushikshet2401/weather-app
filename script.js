const API_KEY = "40db5ec66d904ec29eb111941251708";
const API_BASE = "https://api.weatherapi.com/v1";

const els = {
  input: document.getElementById('cityInput'),
  suggest: document.getElementById('suggest'),
  place: document.getElementById('place'),
  temp: document.getElementById('temp'),
  cond: document.getElementById('cond'),
  icon: document.getElementById('wxIcon'),
  localtime: document.getElementById('localtime'),
  humidity: document.getElementById('humidity'),
  wind: document.getElementById('wind'),
  feels: document.getElementById('feels'),
  pressure: document.getElementById('pressure'),
  vis: document.getElementById('vis'),
  cloud: document.getElementById('cloud'),
  useLocation: document.getElementById('useLocation'),
};

function debounce(fn, delay=250){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),delay)} }

async function fetchSuggestions(q){
  if(!q || q.trim().length < 2){ els.suggest.classList.remove('open'); els.suggest.innerHTML=''; return; }
  try{
    const url = `${API_BASE}/search.json?key=${API_KEY}&q=${encodeURIComponent(q.trim())}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Suggestion error');
    const items = await res.json();
    renderSuggestions(items.slice(0,7));
  }catch(err){ console.error(err); els.suggest.classList.remove('open'); }
}

function renderSuggestions(list){
  if(!list.length){ els.suggest.classList.remove('open'); els.suggest.innerHTML=''; return; }
  els.suggest.innerHTML = list.map((c,i)=>{
    const label = `${c.name}${c.region? ', '+c.region: ''}, ${c.country}`;
    return `<button type="button" data-q="${c.lat},${c.lon}" data-label="${label}" ${i===0?'class="active"':''}><span>📍</span><span>${label}</span></button>`
  }).join('');
  els.suggest.classList.add('open');
}

els.input.addEventListener('keydown', (e)=>{
  if(!els.suggest.classList.contains('open')) return;
  const btns = [...els.suggest.querySelectorAll('button')];
  const idx = btns.findIndex(b=>b.classList.contains('active'));
  if(e.key === 'ArrowDown'){ e.preventDefault(); const n = (idx+1)%btns.length; btns[idx]?.classList.remove('active'); btns[n].classList.add('active'); btns[n].scrollIntoView({block:'nearest'}); }
  if(e.key === 'ArrowUp'){ e.preventDefault(); const n = (idx-1+btns.length)%btns.length; btns[idx]?.classList.remove('active'); btns[n].classList.add('active'); btns[n].scrollIntoView({block:'nearest'}); }
  if(e.key === 'Enter'){
    const pick = btns[idx] || btns[0];
    if(pick){ onPick(pick.dataset.q, pick.dataset.label); }
  }
});

els.suggest.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  onPick(btn.dataset.q, btn.dataset.label);
});

function onPick(q,label){
  els.input.value = label;
  els.suggest.classList.remove('open');
  els.suggest.innerHTML='';
  fetchWeather(q);
}

els.input.addEventListener('input', debounce(e=> fetchSuggestions(e.target.value), 250));

async function fetchWeather(query){
  try{
    toggleLoading(true);
    const url = `${API_BASE}/current.json?key=${API_KEY}&q=${encodeURIComponent(query)}&aqi=no`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Weather lookup failed');
    const data = await res.json();
    renderWeather(data);
    localStorage.setItem('lastQuery', query);
  }catch(err){ console.error(err); alert('Could not fetch weather. Try another city.'); }
  finally{ toggleLoading(false); }
}

function renderWeather(d){
  const loc = d.location; const cur = d.current;
  const label = `${loc.name}${loc.region? ', '+loc.region: ''}, ${loc.country}`;
  els.place.textContent = label;
  els.temp.textContent = Math.round(cur.temp_c)+'°C';
  els.cond.textContent = cur.condition?.text || '-';
  els.icon.src = cur.condition?.icon ? (cur.condition.icon.startsWith('http')? cur.condition.icon : 'https:' + cur.condition.icon) : '';
  els.icon.alt = cur.condition?.text || 'weather';
  els.localtime.textContent = `Local time: ${loc.localtime}`;

  els.humidity.textContent = cur.humidity+' %';
  els.wind.textContent = `${cur.wind_kph} km/h ${degToCompass(cur.wind_degree)}`;
  els.feels.textContent = Math.round(cur.feelslike_c)+'°C';
  els.pressure.textContent = cur.pressure_mb+' mb';
  els.vis.textContent = cur.vis_km+' km';
  els.cloud.textContent = cur.cloud+' %';

  updateBackground(cur.temp_c, cur.is_day === 1);
}

function degToCompass(num){
  const val = Math.floor((num/22.5)+0.5);
  const arr = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return arr[val % 16];
}

function updateBackground(tempC,isDay){
  let gradient;
  if(!isFinite(tempC)){
    gradient = 'linear-gradient(120deg,#2b5876,#4e4376)';
  } else if(!isDay){
    if(tempC <= 10) gradient = 'linear-gradient(135deg,#0f2027,#203a43 40%,#2c5364)';
    else if(tempC <= 25) gradient = 'linear-gradient(135deg,#0b132b,#1c2541 40%,#3a506b)';
    else gradient = 'linear-gradient(135deg,#1e3c72,#2a5298 50%,#19324a)';
  } else {
    if(tempC <= 10) gradient = 'linear-gradient(135deg,#4facfe,#00f2fe)';
    else if(tempC <= 25) gradient = 'linear-gradient(135deg,#43cea2,#185a9d)';
    else gradient = 'linear-gradient(135deg,#f7971e,#ffd200)';
  }
  document.body.style.background = gradient;
  document.body.style.backgroundSize = '200% 200%';
}

function toggleLoading(on){ document.body.style.cursor = on ? 'progress':'default'; }

els.useLocation.addEventListener('click',()=>{
  if(!('geolocation' in navigator)) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude,longitude} = pos.coords;
    fetchWeather(`${latitude},${longitude}`);
  },()=>alert('Location permission denied'));
});

(function init(){
  const last = localStorage.getItem('lastQuery');
  if(last){ fetchWeather(last); els.input.value=last; }
  else { fetchWeather('Bengaluru'); els.input.value='Bengaluru, India'; }
})();