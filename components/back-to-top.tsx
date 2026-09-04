'use client';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
export function BackToTop() { const [show, setShow] = useState(false); useEffect(() => { const onScroll = () => setShow(scrollY > 500); addEventListener('scroll', onScroll, { passive: true }); return () => removeEventListener('scroll', onScroll); }, []); return show ? <button className="back-top" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} aria-label="返回顶部"><ArrowUp /></button> : null }
