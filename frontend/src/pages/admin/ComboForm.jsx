import { useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
    ArrowLeftIcon,
    CurrencyInrIcon,
    PlusIcon,
    TrashIcon,
} from "@phosphor-icons/react";

export default function ComboForm() {

    const navigate = useNavigate();

    const [comboName, setComboName] = useState("");

    const [comboPrice, setComboPrice] = useState(149);

    const [featured, setFeatured] = useState(true);

    const [preorder, setPreorder] = useState(false);

    const [items] = useState([
        {
            id: 1,
            name: "Veg Meals",
            price: 120,
            quantity: 1,
            type: "VEG",
            image:
                "https://images.unsplash.com/photo-1546833999-b9f581a1996d",
        },
    ]);

    const totalPrice = useMemo(() => {
        return items.reduce(
            (acc, item) =>
                acc + item.price * item.quantity,
            0
        );
    }, [items]);

    const savings = totalPrice - comboPrice;

    return (
        <div className="min-h-screen bg-zinc-50 pb-40">

            {/* HEADER */}
            <div className="sticky top-0 z-20 bg-white border-b border-zinc-100">

                <div className="px-4 py-4 flex items-center gap-3">

                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center"
                    >
                        <ArrowLeftIcon size={18} />
                    </button>

                    <div>

                        <h1 className="text-xl font-bold text-zinc-900">
                            Create Combo
                        </h1>

                        <p className="text-sm text-zinc-500">
                            Build combo offerings
                        </p>

                    </div>

                </div>

            </div>

            {/* BODY */}
            <div className="px-4 pt-5 space-y-5">

                {/* SECTION 1 */}
                <SectionCard
                    number="1"
                    title="Combo Details"
                >

                    <div className="space-y-4">

                        <div>

                            <label className="text-sm font-semibold text-zinc-700">
                                Combo Name
                            </label>

                            <Input
                                value={comboName}
                                onChange={(e) =>
                                    setComboName(e.target.value)
                                }
                                placeholder="Lunch Feast"
                                className="mt-2 h-12 rounded-2xl"
                            />

                        </div>

                        <div>

                            <label className="text-sm font-semibold text-zinc-700">
                                Description
                            </label>

                            <Textarea
                                placeholder="Complete lunch combo with sides"
                                className="mt-2 rounded-2xl min-h-[100px]"
                            />

                        </div>

                    </div>

                </SectionCard>

                {/* SECTION 2 */}
                <SectionCard
                    number="2"
                    title="Add Items"
                >

                    <div className="space-y-4">

                        {items.map((item) => (

                            <div
                                key={item.id}
                                className="rounded-[24px] border border-zinc-100 bg-white p-3 shadow-sm"
                            >

                                <div className="flex gap-3">

                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-20 h-20 rounded-2xl object-cover"
                                    />

                                    <div className="flex-1">

                                        <div className="flex justify-between">

                                            <div>

                                                <h3 className="font-bold text-zinc-900">
                                                    {item.name}
                                                </h3>

                                                <Badge className="mt-1 bg-green-100 text-green-700 rounded-full">
                                                    {item.type}
                                                </Badge>

                                            </div>

                                            <button className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                                                <TrashIcon size={16} />
                                            </button>

                                        </div>

                                        <div className="mt-4 flex items-center justify-between">

                                            <div className="flex items-center gap-3 bg-zinc-100 rounded-2xl px-3 py-2">

                                                <button>-</button>

                                                <span className="font-semibold">
                          {item.quantity}
                        </span>

                                                <button className="text-violet-600">
                                                    +
                                                </button>

                                            </div>

                                            <div className="text-right">

                                                <p className="text-xs text-zinc-400">
                                                    Price
                                                </p>

                                                <p className="font-bold text-lg">
                                                    ₹{item.price}
                                                </p>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        ))}

                        <Button
                            variant="outline"
                            className="w-full h-12 rounded-2xl border-dashed"
                        >
                            <PlusIcon size={18} />
                            Add More Items
                        </Button>

                    </div>

                </SectionCard>

                {/* SECTION 3 */}
                <SectionCard
                    number="3"
                    title="Pricing"
                >

                    <div className="space-y-4">

                        <div className="grid grid-cols-2 gap-3">

                            <div className="rounded-[24px] bg-zinc-100 p-4">

                                <p className="text-xs text-zinc-500">
                                    Original
                                </p>

                                <p className="text-2xl font-bold mt-2">
                                    ₹{totalPrice}
                                </p>

                            </div>

                            <div className="rounded-[24px] bg-green-50 border border-green-100 p-4">

                                <p className="text-xs text-green-600">
                                    Savings
                                </p>

                                <p className="text-2xl font-bold mt-2 text-green-700">
                                    ₹{savings}
                                </p>

                            </div>

                        </div>

                        <div>

                            <label className="text-sm font-semibold text-zinc-700">
                                Combo Price
                            </label>

                            <div className="relative mt-2">

                                <CurrencyInrIcon
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                                />

                                <Input
                                    type="number"
                                    value={comboPrice}
                                    onChange={(e) =>
                                        setComboPrice(
                                            Number(e.target.value)
                                        )
                                    }
                                    className="pl-10 h-12 rounded-2xl"
                                />

                            </div>

                        </div>

                    </div>

                </SectionCard>

                {/* SECTION 4 */}
                <SectionCard
                    number="4"
                    title="Availability"
                >

                    <div className="space-y-5">

                        <OptionRow
                            title="Featured Combo"
                            subtitle="Show on homepage"
                            checked={featured}
                            onChange={setFeatured}
                        />

                        <OptionRow
                            title="Preorder Eligible"
                            subtitle="Allow advance booking"
                            checked={preorder}
                            onChange={setPreorder}
                        />

                    </div>

                </SectionCard>

            </div>

            {/* FOOTER */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-4 py-4">

                <div className="flex items-center justify-between mb-3">

                    <div>

                        <p className="text-xs text-zinc-500">
                            Combo Price
                        </p>

                        <p className="text-2xl font-bold">
                            ₹{comboPrice}
                        </p>

                    </div>

                    <div className="text-right">

                        <p className="text-xs text-green-600">
                            Savings
                        </p>

                        <p className="text-xl font-bold text-green-700">
                            ₹{savings}
                        </p>

                    </div>

                </div>

                <Button className="w-full h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold">
                    Save Combo
                </Button>

            </div>

        </div>
    );
}

function SectionCard({
                         number,
                         title,
                         children,
                     }) {
    return (
        <div className="bg-white rounded-[28px] border border-zinc-100 p-5 shadow-sm">

            <div className="flex items-center gap-3 mb-5">

                <div className="w-8 h-8 rounded-full bg-violet-600 text-white text-sm font-bold flex items-center justify-center">
                    {number}
                </div>

                <h2 className="text-lg font-bold text-zinc-900">
                    {title}
                </h2>

            </div>

            {children}

        </div>
    );
}

function OptionRow({
                       title,
                       subtitle,
                       checked,
                       onChange,
                   }) {
    return (
        <div className="flex items-center justify-between">

            <div>

                <p className="font-semibold text-zinc-900">
                    {title}
                </p>

                <p className="text-sm text-zinc-500">
                    {subtitle}
                </p>

            </div>

            <Switch
                checked={checked}
                onCheckedChange={onChange}
            />

        </div>
    );
}