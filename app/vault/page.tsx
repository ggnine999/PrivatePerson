import type { Metadata } from 'next';
import { VaultApp } from '@/components/vault-app';
export const metadata:Metadata={title:'私人保险库',robots:{index:false,follow:false,nocache:true}};
export default function VaultPage(){return <VaultApp/>}
