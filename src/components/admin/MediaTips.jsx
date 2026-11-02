'use client';
// What to upload, next to each upload button. The figures follow what the admin does with a file (resized to 1200 px
// on the long side, saved as WebP) and how the guest menu shows it (cropped to the tile, or the dish on a dark stage).
const TIPS = {
  dish: [
    ['Формат', 'JPG, PNG или WebP. Фото с iPhone (HEIC) лучше сначала сохранить как JPG.'],
    ['Размер', 'квадрат от 1200×1200 px, минимум 800×800. Сайт сам уменьшит файл до 1200 px.'],
    ['Кадр', 'блюдо целиком и по центру, вид чуть сверху, с небольшим запасом по краям.'],
    ['Вырезка фона', 'лучше всего работает на однотонном фоне, контрастном к блюду, без лишних предметов, рук и резких теней.'],
    ['Свет', 'ровный и яркий, без вспышки. На сайте фон тёмный, поэтому тёмные снимки теряются.'],
    ['Видео', 'здесь загрузить нельзя: см. ниже.'],
  ],
  tile: [
    ['Формат', 'JPG, PNG или WebP. Фото с iPhone (HEIC) лучше сначала сохранить как JPG.'],
    ['Размер', '1600×1200 px (4:3), минимум 1200×900. Сайт сам уменьшит файл до 1200 px.'],
    ['Кадр', 'плитка бывает большой, квадратной, высокой и широкой, картинка обрезается по краям. Главный объект держите в центре, примерно в средней трети кадра.'],
    ['Текст', 'название ложится поверх картинки внизу слева, поэтому там нужен спокойный тёмный участок. Своего текста и логотипов на картинке быть не должно.'],
    ['Фон', 'тёмный, в стиле меню: так плитка не будет выделяться среди остальных.'],
    ['Видео', 'здесь загрузить нельзя: см. ниже.'],
  ],
};
const VIDEO = 'Клипы в меню добавляет разработчик: фон вырезается, файл сжимается под телефоны. Исходник: MP4 или MOV, от 1080 px по короткой стороне, 5–10 секунд, объект целиком в кадре на зелёном однотонном фоне, камера неподвижна.';

export default function MediaTips({ kind }) {
  return (
    <details className="rounded-xl border border-white/10 px-3 py-2 text-xs leading-relaxed text-white/60">
      <summary className="cursor-pointer select-none text-sm text-white/75">Какие файлы загружать</summary>
      <dl className="mt-2 flex flex-col gap-1.5">
        {TIPS[kind].map(([k, v]) => <div key={k}><dt className="inline font-semibold text-white/80">{k}: </dt><dd className="inline">{v}</dd></div>)}
      </dl>
      <p className="mt-2 border-t border-white/10 pt-2">{VIDEO}</p>
    </details>
  );
}
