'use client';

import { useRef, useEffect } from 'react';

// Cuánto hay que mover el mouse para que cuente como arrastre y no como click.
const DRAG_THRESHOLD_PX = 6;

/**
 * Convierte un contenedor con scroll horizontal en un carrusel arrastrable con
 * el mouse. En touch no interviene: ahí ya scrollea nativo.
 *
 * Además cancela el click que dispara el browser al soltar tras un arrastre.
 * Sin eso, arrastrar un carrusel de links (el feed de Instagram, las reseñas)
 * termina abriendo el elemento que quedó abajo del cursor.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let dragged = false;
    let startX: number;
    let scrollLeft: number;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      dragged = false;
      el.classList.add('cursor-grabbing');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onMouseLeave = () => { isDown = false; el.classList.remove('cursor-grabbing'); };
    const onMouseUp = () => { isDown = false; el.classList.remove('cursor-grabbing'); };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      if (Math.abs(x - startX) > DRAG_THRESHOLD_PX) dragged = true;
      el.scrollLeft = scrollLeft - (x - startX) * 1.5;
    };
    // En captura, para llegar antes que el handler del link o del botón.
    const onClickCapture = (e: MouseEvent) => {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return ref;
}
