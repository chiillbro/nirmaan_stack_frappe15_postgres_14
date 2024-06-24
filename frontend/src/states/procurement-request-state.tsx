import { create } from 'zustand';



const initialPR = {
    project: '',
    work_package: '',
    procurement_list: {
        list: []
    },
    category_list: {
        list: []
    },
    project_lead: '',
    procurement_executive: ''
}

const useProcurementRequest = create((set, get) => ({
    ...initialPR,
    reset: () => { set(initialPR) },
    setProject: (id: string) => { set({ project: id }) },
    setProcurementExecutive: (id: string) => { set({ procurement_executive: id }) },
    setProjectLead: (id: string) => { set({ project_lead: id }) },
    resetCategories: () => { set({ category_list: ({ list: [] }) }) },
    setWorkPackage: (wp: string) => { set({ work_package: wp }) },
    // TS-RESOLVE
    setCategories: (categoryList: string) => {
        set({
            category_list: {
                list: [...categoryList]
            }
        });
    },
    // TS-RESOLVE
    addItemToProcurementList: (itemObject: any, curCategory: string) => {
        const { procurement_list } = get()
        const curRequest = [...procurement_list.list];
        const curValue = {
            item: itemObject.item,
            name: itemObject.name,
            unit: itemObject.unit,
            quantity: itemObject.quantity,
            category: curCategory,
        };
        const isDuplicate = curRequest.some((item) => item.item === curValue.item);
        if (!isDuplicate) {
            curRequest.push(curValue);
            set({
                procurement_list: {
                    list: curRequest,
                }
            })
        };
    },
    // TS-RESOLVE
    deleteItemFromProcurementList: (item: string) => {
        const { procurement_list } = get();
        let curRequest = procurement_list.list;
        curRequest = curRequest.filter(curValue => curValue.item !== item);
        set({
            procurement_list: {
                list: curRequest
            }
        });
    },
    // TS-RESOLVE
    changeItemFromPrcurementList: (item: string, quantity: Number) => {
        const { procurement_list } = get();
        let curRequest = procurement_list.list;
        curRequest = curRequest.map((curValue: any) => {
            if (curValue.item === item) {
                return { ...curValue, quantity: quantity };
            }
            return curValue;
        });
        if (quantity) {
            set({
                procurement_list: {
                    list: curRequest
                }
            });
        }
    },
    generateProcuremntRequestObject: () => {
        const state = get();
        const customObject: { [key: string]: any } = {};

        for (const key in state) {
            if (Object.prototype.hasOwnProperty.call(state, key) && typeof state[key] !== 'function') {
                customObject[key] = state[key];
            }
        }

        return customObject;
    }

}))

export default useProcurementRequest;