import { FOODS, PLATE_RULES } from '../defaults.js';
import { esc } from '../ui.js';

export function render(root) {
  root.innerHTML = `
    <div class="row between"><h1>Food on a budget</h1><a href="#more" class="btn sm">‹ More</a></div>
    <p class="mut sm" style="margin-top:6px">Target: a protein source in every meal. No gram counting needed. Approx. intake target 2,500–2,700 kcal/day (maintenance ≈ 3,400–3,500).</p>

    <h2>Plate rules</h2>
    <div class="card">${PLATE_RULES.map(r => `<div class="plan">${esc(r)}</div>`).join('')}</div>

    <h2>Cheap protein (Morocco)</h2>
    <div class="card">
      <table class="t">
        <tr><th>Food</th><th>Protein</th></tr>
        ${FOODS.map(f => `<tr><td><b style="font-weight:600">${esc(f.name)}</b>${f.note ? `<div class="xs mut">${esc(f.note)}</div>` : ''}</td><td class="sm num">${esc(f.protein)}</td></tr>`).join('')}
      </table>
    </div>

    <h2>Example cheap day</h2>
    <div class="card sm">
      <div class="plan"><b>Meal 1</b> 3–4 eggs, tomato, ¼ khobz, tea without sugar</div>
      <div class="plan"><b>Meal 2</b> Big bowl of 3des or loubia, salad, ¼ khobz</div>
      <div class="plan"><b>Meal 3</b> Sardines or chicken + vegetables (tajine plate), ¼ khobz</div>
      <div class="plan"><b>Planned snack</b> Lben / raib or a glass of milk</div>
    </div>
  `;
}
