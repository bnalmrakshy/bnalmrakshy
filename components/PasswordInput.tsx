"use client";
import { useState } from "react";
import Icon from "@/components/Icons";
export default function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} data-pw type={show ? "text" : "password"} dir="ltr" style={{ textAlign: "right" }} className={"w-full " + (props.className ?? "")} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "إخفاء الباسورد" : "إظهار الباسورد"} aria-pressed={show} className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-roast active:scale-90 transition">
        <Icon name={show ? "eyeoff" : "eye"} size={20} /></button>
    </div>);
}
