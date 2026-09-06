'use client';
import Image from 'next/image';
import { X, ZoomIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
// 灯箱用 showModal() 进入顶层渲染层，避免被粘性导航遮挡关闭按钮。
export function ImagePreview({src,alt}:{src:string;alt:string}) { const [open,setOpen]=useState(false); const dialogRef=useRef<HTMLDialogElement>(null); useEffect(()=>{ const dialog=dialogRef.current; if(!dialog)return; if(open&&!dialog.open)dialog.showModal(); if(!open&&dialog.open)dialog.close(); },[open]); return <><button className="preview-image" onClick={()=>setOpen(true)} aria-label="预览封面大图"><Image src={src} alt={alt} fill sizes="(max-width:900px) 100vw, 760px"/><span><ZoomIn/> 查看大图</span></button>{open&&<dialog ref={dialogRef} className="lightbox" onClose={()=>setOpen(false)} aria-label="图片预览"><button aria-label="关闭预览" onClick={()=>setOpen(false)}><X/></button><Image src={src} alt={alt} fill sizes="100vw"/></dialog>}</> }
