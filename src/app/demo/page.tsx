import type { Metadata } from "next";
import { DemoWorkspace } from "./demo-workspace";
export const metadata:Metadata={title:"Elarventis — Sovellusdemo",description:"Interaktiivinen esikatselu Elarventiksen työtilasta kuvitteellisella aineistolla."};
export default function DemoPage(){return <DemoWorkspace/>;}
