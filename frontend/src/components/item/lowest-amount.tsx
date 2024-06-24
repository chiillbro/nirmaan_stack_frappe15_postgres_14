import useLowestQuote from "@/hooks/useLowestQuote";
import { useEffect, useMemo, useState } from "react";

interface LowestAmountProps {
    itemIds: string[]
}

export default function LowestAmount({ itemIds }: LowestAmountProps) {
    const [total, setTotal] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;

        const fetchQuotes = async () => {
            try {
                setLoading(true);
                const quotePromises = itemIds.map(async (itemId) => {
                    const { lowestQuote, quote_loading, quote_error } = useLowestQuote(itemId);
                    if (quote_error) throw new Error(`Error fetching quote for item ${itemId}`);
                    return lowestQuote;
                });

                const results = await Promise.all(quotePromises);

                if (!isCancelled) {
                    const sum = results.reduce((acc, quote) => acc + (parseFloat(quote) || 0), 0);
                    setTotal(sum);
                    setLoading(false);
                }
            } catch (err) {
                if (!isCancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        fetchQuotes();

        return () => {
            isCancelled = true;
        };
    }, [itemIds]);

    if (loading) return <span>Loading...</span>;
    if (error) return <span>{error}</span>;
    if (total !== null) return <span>Total of lowest quotes: {total}</span>;
    return <span>No quotes available</span>;

    // const getTotal = (order_id: string) => {
    //     let total: number = 0;
    //     const orderData = procurement_request_list?.find(item => item.name === order_id)?.procurement_list;
    //     console.log("orderData", orderData)
    //     orderData?.list.map((item) => {
    //         const quotesForItem = quote_data
    //             ?.filter(value => value.item === item.name && value.quote != null)
    //             ?.map(value => value.quote);
    //         let minQuote;
    //         if (quotesForItem && quotesForItem.length > 0) minQuote = Math.min(...quotesForItem);
    //         total += (minQuote ? parseFloat(minQuote) : 0) * item.quantity;
    //     })
    //     return total;
    // }
}