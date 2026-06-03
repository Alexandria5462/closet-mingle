import React from "react";
import { useNavigate } from "react-router-dom";

export default function TabBar({ active, type = "client" }) {
  const nav = useNavigate();
  const clientTabs = [
    { id:"home", icon:"ti-home", label:"Home", path:"/home" },
    { id:"closet", icon:"ti-hanger", label:"Closet", path:"/closet" },
    { id:"outfits", icon:"ti-sparkles", label:"Swipe", path:"/outfits" },
    { id:"liked", icon:"ti-heart", label:"Liked", path:"/liked" },
    { id:"saved", icon:"ti-bookmark", label:"Saved", path:"/saved" },
    { id:"account", icon:"ti-user", label:"Account", path:"/account" },
  ];
  const stylistTabs = [
    { id:"home", icon:"ti-home", label:"Home", path:"/stylist" },
    { id:"messages", icon:"ti-message-circle", label:"Messages", path:"/stylist" },
    { id:"analytics", icon:"ti-chart-bar", label:"Analytics", path:"/account" },
    { id:"account", icon:"ti-user", label:"Profile", path:"/account" },
  ];
  const tabs = type === "stylist" ? stylistTabs : clientTabs;
  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button key={t.id} className={`tab-btn${active===t.id?" active":""}`} onClick={()=>nav(t.path)}>
          <i className={`ti ${t.icon}`} aria-hidden="true"></i>
          {t.label}
        </button>
      ))}
    </div>
  );
}
