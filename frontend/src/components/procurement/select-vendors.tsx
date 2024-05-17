
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { useFrappeGetDocList, useFrappeUpdateDoc } from "frappe-react-sdk";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react"

interface VendorItem {
    vendor: string;
    item: string;
}

export const SelectVendors = () => {
    const { orderId } = useParams<{ orderId: string }>()
    const navigate = useNavigate()

    const { data: procurement_request_list, isLoading: procurement_request_list_loading, error: procurement_request_list_error } = useFrappeGetDocList("Procurement Requests",
        {
            fields: ['name', 'category_list', 'workflow_state', 'owner', 'project', 'work_package', 'procurement_list', 'creation']
        });
    const { data: vendor_list, isLoading: vendor_list_loading, error: vendor_list_error } = useFrappeGetDocList("Vendors",
        {
            fields: ['name', 'vendor_name', 'vendor_address']
        });
    const { data: quotation_request_list, isLoading: quotation_request_list_loading, error: quotation_request_list_error } = useFrappeGetDocList("Quotation Requests",
        {
            fields: ['name', 'project', 'item', 'category', 'vendor', 'procurement_task', 'quote']
        });
    const { updateDoc: updateDoc, loading: loading, isCompleted: submit_complete, error: submit_error } = useFrappeUpdateDoc()

    const [page, setPage] = useState<string>('updatequotation')
    const [orderData, setOrderData] = useState({
        project: '',
        work_package: '',
        procurement_list: {
            list: []
        },
        category_list: {
            list: []
        }
    })
    if (!orderData.project) {
        procurement_request_list?.map(item => {
            if (item.name === orderId) {
                setOrderData(item)
            }
        })
    }
    const [selectedVendors, setSelectedVendors] = useState({})
    const [selectedCategories, setSelectedCategories] = useState({})

    useEffect(() => {
        const updatedCategories = { ...selectedCategories };
        orderData?.category_list.list.map((cat) => {
            const newVendorsSet = new Set();
            const curCategory = cat.name
            quotation_request_list?.forEach((item) => {
                if (item.category === cat.name) {
                    if (!Array.isArray(updatedCategories[curCategory])) {
                        updatedCategories[curCategory] = [];
                    }
                    newVendorsSet.add(item.vendor);
                }
            });
            const newVendors = Array.from(newVendorsSet);
            updatedCategories[curCategory] = newVendors;
        })
        setSelectedCategories(updatedCategories);
    }, [quotation_request_list]);

    const getVendorName = (vendorName: string) => {
        return vendor_list?.find(vendor => vendor.name === vendorName)?.vendor_name;
    }
    const handleRadioChange = (cat, vendor) => {
        setSelectedVendors(prevState => {
            if (prevState.hasOwnProperty(cat)) {
                return { ...prevState, [cat]: vendor };
            } else {
                return { ...prevState, [cat]: vendor };
            }
        });
    };

    const handleChangeWithParam = (cat, vendor) => {
        return () => handleRadioChange(cat, vendor);
    };

    const handleSubmit = () => {
        quotation_request_list?.map((item) => {
            const cat = item.category;
            if (selectedVendors[cat] === item.vendor) {
                console.log(item)
                updateDoc('Quotation Requests', item.name, {
                    is_selected: "True",
                })
                    .then(() => {
                        console.log("item", item.name)
                        setPage('updatequotation')
                    }).catch(() => {
                        console.log(submit_error)
                    })
            }
        })

        updateDoc('Procurement Requests', orderId, {
            workflow_state: "Vendor Selected",
        })
            .then(() => {
                console.log(orderId)
                navigate("/")
            }).catch(() => {
                console.log(submit_error)
            })

    }

    const generateVendorItemKey = (vendor: string, item: string): string => {
        return `${vendor}-${item}`;
    };
    const [priceMap, setPriceMap] = useState(new Map<string, string>());

    const getPrice = (vendor: string, item: string): string | undefined => {
        const key = generateVendorItemKey(vendor, item);
        return priceMap.get(key);
    };
    useEffect(() => {
        const newPriceMap = new Map<string, string>();
        quotation_request_list.forEach((item) => {
            const key = generateVendorItemKey(item.vendor, item.item);
            newPriceMap.set(key, item.quote);
        });
        setPriceMap(newPriceMap);
    }, [quotation_request_list]);
    console.log(selectedVendors)

    return (
        <>
            {page == 'updatequotation' &&
                <div className="flex">
                    <div className="w-1/5 h-[600px] rounded-lg m-1 p-2 border-2 border-gray-300">
                        Sidebar Content
                    </div>
                    <div className="flex-1 space-x-2 md:space-y-4 p-2 md:p-12 pt-6">
                        <div className="flex items-center space-y-2">
                            <ArrowLeft />
                            <h2 className="text-base pt-1 pl-2 pb-4 font-bold tracking-tight">Orders</h2>
                        </div>
                        <div className="grid grid-cols-5 gap-4 border border-gray-100 rounded-lg p-4">
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">Date</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.creation?.split(" ")[0]}</p>
                            </div>
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">Project</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.project}</p>
                            </div>
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">Package</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.work_package}</p>
                            </div>
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">Project Lead</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.owner}</p>
                            </div>
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">PR Number</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.name?.slice(-4)}</p>
                            </div>
                        </div>
                        {orderData?.category_list?.list.map((cat) => {
                            const curCategory = cat.name;
                            return <div>
                                <Card className="flex w-full shadow-none border border-grey-500" >
                                    <CardHeader className="w-full">
                                        <CardTitle className="font-bold text-xl">
                                            {cat.name}
                                        </CardTitle>
                                        <div className="flex">
                                            <div className='flex-1'>
                                                <div className="bg-gray-200 p-2 font-semibold">Items</div>
                                                {orderData?.procurement_list?.list.map((item) => {
                                                    if (item.category === cat.name) {
                                                        return <div className="py-2 text-sm px-2 font-semibold border-b">
                                                            {item.item}
                                                        </div>
                                                    }
                                                })}
                                                <div className="py-4 text-sm px-2 font-semibold">
                                                    Total
                                                </div>
                                            </div>
                                            {selectedCategories[curCategory]?.map((item) => {
                                                let total: number = 0;
                                                return <div className='flex-1'>
                                                    <div className="truncate bg-gray-200 font-semibold p-2"><input className="mr-2" type="radio" id={item} name={cat.name} value={item} onChange={handleChangeWithParam(cat.name, item)} />{getVendorName(item)}</div>
                                                    {orderData?.procurement_list.list.map((value) => {
                                                        if (value.category === cat.name) {
                                                            const price = getPrice(item, value.name);
                                                            total += price ? parseFloat(price) : 0;
                                                            return <div className="py-2 text-sm px-2 text-gray-500 border-b">
                                                                {price}
                                                            </div>
                                                        }
                                                    })}
                                                    <div className="py-4 font-semibold text-sm px-2">
                                                        {total}
                                                    </div>
                                                </div>
                                            })}
                                        </div>
                                    </CardHeader>
                                </Card>
                            </div>
                        })}
                        <div className="flex flex-col justify-end items-end fixed bottom-4 right-4">
                            <button className="bg-red-500 text-white font-normal py-2 px-6 rounded-lg" onClick={() => setPage('approvequotation')}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>}
            {page == 'approvequotation' &&
                <div className="flex">
                    <div className="w-1/5 h-[600px] rounded-lg m-1 p-2 border-2 border-gray-300">
                        Sidebar Content
                    </div>
                    <div className="flex-1 space-x-2 md:space-y-4 p-2 md:p-12 pt-6">
                        <div className="flex items-center space-y-2">
                            <ArrowLeft onClick={() => setPage('updatequotation')} />
                            <h2 className="text-base pt-1 pl-2 pb-4 font-bold tracking-tight">Orders</h2>
                        </div>
                        <div className="grid grid-cols-5 gap-4 border border-gray-100 rounded-lg p-4">
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">Date</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.creation?.split(" ")[0]}</p>
                            </div>
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">Project</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.project}</p>
                            </div>
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">Package</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.work_package}</p>
                            </div>
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">Project Lead</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.owner}</p>
                            </div>
                            <div className="border-0 flex flex-col items-center justify-center">
                                <p className="text-left py-1 font-semibold text-sm text-gray-300">PR Number</p>
                                <p className="text-left font-bold py-1 font-bold text-base text-black">{orderData?.name?.slice(-4)}</p>
                            </div>
                        </div>
                        {orderData?.category_list?.list.map((cat) => {
                            const curCategory = cat.name
                            let total: number = 0;
                            return <div className="w-1/2">
                                <div className="font-bold text-xl py-2">{cat.name}</div>
                                <Card className="flex w-full shadow-none border border-grey-500" >
                                    <CardHeader className="w-full">
                                        <CardTitle>
                                            <div className="text-sm text-gray-400">Selected Vendor</div>
                                            <div className="font-bold text-lg border-b py-2 border-gray-200">{getVendorName(selectedVendors[curCategory])}</div>
                                        </CardTitle>
                                        {orderData?.procurement_list.list.map((item) => {
                                            const price = getPrice(selectedVendors[curCategory], item.name);
                                            total += price ? parseFloat(price) : 0;
                                            if (item.category === curCategory) {
                                                return <div className="flex justify-between py-2">
                                                    <div className="text-sm">{item.item}</div>
                                                    <div className="text-sm">{price}</div>
                                                </div>
                                            }
                                        })}
                                    </CardHeader>
                                </Card>
                            </div>
                        })}
                        <div className="flex flex-col justify-end items-end fixed bottom-4 right-4">
                            <button className="bg-red-500 text-white font-normal py-2 px-6 rounded-lg" onClick={() => handleSubmit()}>
                                Send for Approval
                            </button>
                        </div>
                    </div>
                </div>}
        </>
    )
}