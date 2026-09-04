'use client';
import Image from 'next/image';
import { X, ZoomIn } from 'lucide-react';
import { useEffect, useState } from 'react';
export function ImagePreview({src,alt}:{src:string;alt:string}) { const [open,setOpen]=useState(false); useEffect(()=>{ const close=(event:KeyboardEvent)=>event.key==='Escape'&&setOpen(false); addEventListener('keydown',close); return()=>removeEventListener('keydown',close)},[]); return <><button className="preview-image" onClick={()=>setOpen(true)} aria-label="预览封面大图"><Image src={src} alt={alt} fill sizes="(max-width:900px) 100vw, 760px"/><span><ZoomIn/> 查看大图</span></button>{open&&<dialog className="lightbox" open aria-label="图片预览"><button aria-label="关闭预览" onClick={()=>setOpen(false)}><X/></button><Image src={src} alt={alt} fill sizes="100vw"/></dialog>}</> }
