import { useState, useEffect } from 'react';
import { useFrappeGetDocList } from 'frappe-react-sdk';
import { QuotationRequests } from '@/types/NirmaanStack/QuotationRequests';

const useLowestQuote = (item_id: string) => {
    const { data: quote_data, isLoading: quote_loading, error: quote_error } = useFrappeGetDocList<QuotationRequests>("Quotation Requests", {
        fields: ['item', 'quote'],
        filters: [['item', '=', item_id],['quote','!=',null]],
        orderBy: {
            field: 'quote',
            order: 'asc'
        },
        limit: 1
    });

    const [lowestQuote, setLowestQuote] = useState<string | null>();

    useEffect(() => {
        if (quote_data && quote_data.length > 0) {
            setLowestQuote(quote_data[0].quote);
        } else {
            setLowestQuote(null);
        }
    }, [quote_data]);

    return { lowestQuote, quote_loading, quote_error };
};

export default useLowestQuote;
