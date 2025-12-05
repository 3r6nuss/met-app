import React, { useState, useEffect } from 'react';
import {
    BookOpen, Users, Radio, LogOut, Heart, Truck, MapPin, AlertTriangle,
    Edit, Save, Plus, Trash2, X, ChevronUp, ChevronDown, Info, Star, Shield, Settings
} from 'lucide-react';

const iconMap = {
    BookOpen, Users, Radio, LogOut, Heart, Truck, MapPin, AlertTriangle,
    Info, Star, Shield, Settings
};

const colorOptions = [
    { name: 'violet', bg: 'bg-violet-500', text: 'text-violet-300', border: 'border-violet-500' },
    { name: 'fuchsia', bg: 'bg-fuchsia-500', text: 'text-fuchsia-300', border: 'border-fuchsia-500' },
    { name: 'red', bg: 'bg-red-500', text: 'text-red-300', border: 'border-red-400' }, // red-400 for border usually
    { name: 'pink', bg: 'bg-pink-500', text: 'text-pink-300', border: 'border-pink-500' },
    { name: 'blue', bg: 'bg-blue-500', text: 'text-blue-300', border: 'border-blue-500' },
    { name: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-300', border: 'border-emerald-500' },
    { name: 'amber', bg: 'bg-amber-500', text: 'text-amber-300', border: 'border-amber-500' },
    { name: 'cyan', bg: 'bg-cyan-500', text: 'text-cyan-300', border: 'border-cyan-500' },
];

export default function BeginnerGuidePage({ user }) {
    const [guideData, setGuideData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);

    const isAdmin = user?.role === 'Administrator';

    useEffect(() => {
        fetch('/api/guide')
            .then(res => res.json())
            .then(data => {
                setGuideData(data);
                setEditData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch guide:", err);
                setLoading(false);
            });
    }, []);

    const handleSave = () => {
        fetch('/api/guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editData)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setGuideData(editData);
                    setIsEditing(false);
                } else {
                    alert("Fehler beim Speichern");
                }
            })
            .catch(() => alert("Netzwerkfehler"));
    };

    const handleSectionChange = (index, field, value) => {
        const newSections = [...editData.sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setEditData({ ...editData, sections: newSections });
    };

    const handleContentChange = (sectionIndex, contentIndex, field, value) => {
        const newSections = [...editData.sections];
        const newContent = [...newSections[sectionIndex].content];
        newContent[contentIndex] = { ...newContent[contentIndex], [field]: value };
        newSections[sectionIndex].content = newContent;
        setEditData({ ...editData, sections: newSections });
    };

    const handleListItemChange = (sectionIndex, contentIndex, itemIndex, value) => {
        const newSections = [...editData.sections];
        const newContent = [...newSections[sectionIndex].content];
        const newItems = [...newContent[contentIndex].items];
        newItems[itemIndex] = value;
        newContent[contentIndex].items = newItems;
        newSections[sectionIndex].content = newContent;
        setEditData({ ...editData, sections: newSections });
    };

    const handleKeyValueChange = (sectionIndex, contentIndex, itemIndex, key, value) => {
        const newSections = [...editData.sections];
        const newContent = [...newSections[sectionIndex].content];
        const newItems = [...newContent[contentIndex].items];
        newItems[itemIndex] = { ...newItems[itemIndex], [key]: value };
        newContent[contentIndex].items = newItems;
        newSections[sectionIndex].content = newContent;
        setEditData({ ...editData, sections: newSections });
    };

    const addSection = () => {
        setEditData({
            ...editData,
            sections: [
                ...editData.sections,
                {
                    id: Date.now().toString(),
                    title: "Neue Sektion",
                    icon: "Info",
                    color: "violet",
                    content: [{ type: "list", items: ["Neuer Eintrag"] }]
                }
            ]
        });
    };

    const removeSection = (index) => {
        if (confirm("Sektion wirklich löschen?")) {
            const newSections = editData.sections.filter((_, i) => i !== index);
            setEditData({ ...editData, sections: newSections });
        }
    };

    const addListItem = (sectionIndex, contentIndex) => {
        const newSections = [...editData.sections];
        newSections[sectionIndex].content[contentIndex].items.push("Neuer Eintrag");
        setEditData({ ...editData, sections: newSections });
    };

    const removeListItem = (sectionIndex, contentIndex, itemIndex) => {
        const newSections = [...editData.sections];
        newSections[sectionIndex].content[contentIndex].items.splice(itemIndex, 1);
        setEditData({ ...editData, sections: newSections });
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Lade Guide...</div>;
    if (!guideData) return <div className="p-8 text-center text-slate-400">Keine Daten verfügbar.</div>;

    const data = isEditing ? editData : guideData;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32 space-y-8 animate-fade-in relative">
            {/* Edit Toggle */}
            {isAdmin && (
                <div className="fixed bottom-8 right-8 z-50 flex gap-2">
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg transition-all">
                                <Save className="w-6 h-6" />
                            </button>
                            <button onClick={() => { setIsEditing(false); setEditData(guideData); }} className="p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="p-4 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-lg transition-all">
                            <Edit className="w-6 h-6" />
                        </button>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="glass-panel p-8 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-slate-900/90 to-slate-800/90 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        {isEditing ? (
                            <div className="space-y-2">
                                <input
                                    value={editData.header.title}
                                    onChange={(e) => setEditData({ ...editData, header: { ...editData.header, title: e.target.value } })}
                                    className="text-4xl md:text-5xl font-bold bg-transparent border-b border-slate-700 text-white w-full focus:outline-none focus:border-violet-500"
                                />
                                <input
                                    value={editData.header.subtitle}
                                    onChange={(e) => setEditData({ ...editData, header: { ...editData.header, subtitle: e.target.value } })}
                                    className="text-xl text-slate-300 font-medium tracking-wide bg-transparent border-b border-slate-700 w-full focus:outline-none focus:border-violet-500"
                                />
                            </div>
                        ) : (
                            <>
                                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-2">
                                    {data.header.title}
                                </h1>
                                <p className="text-xl text-slate-300 font-medium tracking-wide">{data.header.subtitle}</p>
                            </>
                        )}
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl">
                        <img src="/logo.png" alt="MET Logo" className="w-24 h-24 object-contain" />
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 gap-6">
                {data.sections.map((section, sIndex) => {
                    const Icon = iconMap[section.icon] || Info;
                    const color = colorOptions.find(c => c.name === section.color) || colorOptions[0];
                    const borderColorClass = color.border ? `border-${color.name === 'red' ? 'red-400' : color.name + '-500'}` : 'border-slate-700';
                    const textColorClass = color.text;
                    const bgColorClass = color.bg;

                    return (
                        <section key={section.id} className={`glass-panel p-6 rounded-2xl border-l-4 ${borderColorClass} relative group`}>
                            {isEditing && (
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => removeSection(sIndex)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-4 mb-4">
                                {isEditing ? (
                                    <div className="flex gap-2 items-center flex-1">
                                        <select
                                            value={section.icon}
                                            onChange={(e) => handleSectionChange(sIndex, 'icon', e.target.value)}
                                            className="bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700"
                                        >
                                            {Object.keys(iconMap).map(icon => <option key={icon} value={icon}>{icon}</option>)}
                                        </select>
                                        <select
                                            value={section.color}
                                            onChange={(e) => handleSectionChange(sIndex, 'color', e.target.value)}
                                            className="bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-700"
                                        >
                                            {colorOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <input
                                            value={section.title}
                                            onChange={(e) => handleSectionChange(sIndex, 'title', e.target.value)}
                                            className="bg-transparent border-b border-slate-700 text-white flex-1 p-1 focus:outline-none focus:border-violet-500 font-bold text-xl"
                                        />
                                    </div>
                                ) : (
                                    <h2 className={`text-2xl font-bold ${textColorClass} flex items-center gap-2`}>
                                        <Icon className="w-6 h-6" />
                                        {section.title}
                                    </h2>
                                )}
                            </div>

                            <div className="space-y-4">
                                {section.content.map((block, cIndex) => (
                                    <div key={cIndex}>
                                        {block.type === 'list' && (
                                            <ul className="space-y-2 text-slate-300 ml-2">
                                                {block.items.map((item, iIndex) => (
                                                    <li key={iIndex} className="flex items-start gap-2 group/item">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${bgColorClass} mt-2 shrink-0`}></span>
                                                        {isEditing ? (
                                                            <div className="flex-1 flex gap-2">
                                                                <textarea
                                                                    value={item}
                                                                    onChange={(e) => handleListItemChange(sIndex, cIndex, iIndex, e.target.value)}
                                                                    className="w-full bg-slate-800/50 border border-slate-700 rounded p-1 text-sm focus:outline-none focus:border-violet-500"
                                                                    rows={2}
                                                                />
                                                                <button onClick={() => removeListItem(sIndex, cIndex, iIndex)} className="text-red-400 hover:text-red-300 opacity-0 group-hover/item:opacity-100">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span dangerouslySetInnerHTML={{ __html: item }} />
                                                        )}
                                                    </li>
                                                ))}
                                                {isEditing && (
                                                    <button onClick={() => addListItem(sIndex, cIndex)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-2">
                                                        <Plus className="w-3 h-3" /> Eintrag hinzufügen
                                                    </button>
                                                )}
                                            </ul>
                                        )}

                                        {block.type === 'text' && (
                                            isEditing ? (
                                                <textarea
                                                    value={block.value}
                                                    onChange={(e) => handleContentChange(sIndex, cIndex, 'value', e.target.value)}
                                                    className="w-full bg-slate-800/50 border border-slate-700 rounded p-2 text-slate-300 focus:outline-none focus:border-violet-500"
                                                />
                                            ) : (
                                                <p className={block.className || "text-slate-300"}>{block.value}</p>
                                            )
                                        )}

                                        {block.type === 'key-value' && (
                                            <ul className="space-y-2 text-slate-300 ml-2">
                                                {block.items.map((item, iIndex) => (
                                                    <li key={iIndex} className="flex justify-between border-b border-slate-800 pb-1">
                                                        {isEditing ? (
                                                            <>
                                                                <input
                                                                    value={item.key}
                                                                    onChange={(e) => handleKeyValueChange(sIndex, cIndex, iIndex, 'key', e.target.value)}
                                                                    className="bg-transparent border-b border-slate-700 text-slate-300 w-1/3"
                                                                />
                                                                <input
                                                                    value={item.value}
                                                                    onChange={(e) => handleKeyValueChange(sIndex, cIndex, iIndex, 'value', e.target.value)}
                                                                    className="bg-transparent border-b border-slate-700 text-right w-1/3 font-mono"
                                                                />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>{item.key}</span>
                                                                <span className={`font-mono ${textColorClass.replace('300', '400')}`}>{item.value}</span>
                                                            </>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {block.type === 'scenario' && (
                                            <div className="mb-6">
                                                {isEditing ? (
                                                    <div className="space-y-2 p-4 bg-slate-800/30 rounded-lg">
                                                        <input
                                                            value={block.title}
                                                            onChange={(e) => handleContentChange(sIndex, cIndex, 'title', e.target.value)}
                                                            className="w-full bg-transparent border-b border-slate-700 text-red-400 font-semibold mb-2"
                                                        />
                                                        <textarea
                                                            value={block.text}
                                                            onChange={(e) => handleContentChange(sIndex, cIndex, 'text', e.target.value)}
                                                            className="w-full bg-slate-800/50 border border-slate-700 rounded p-2 text-emerald-400/90"
                                                            rows={3}
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <h3 className="text-lg font-semibold text-red-400 mb-2">{block.title}</h3>
                                                        <p className="text-emerald-400/90 leading-relaxed pl-4 border-l-2 border-emerald-500/30">
                                                            {block.text}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}

                {isEditing && (
                    <button onClick={addSection} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-all flex items-center justify-center gap-2">
                        <Plus className="w-6 h-6" /> Sektion hinzufügen
                    </button>
                )}
            </div>
        </div>
    );
}
