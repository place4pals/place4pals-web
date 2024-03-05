import { useState } from 'react';
import * as Auth from 'aws-amplify/auth';
import { useParams } from 'react-router-dom';
import { loadStripe } from "@stripe/stripe-js/pure";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import * as API from 'aws-amplify/api';
import { useGlobalStore } from '#src/utils';
import { Modal } from '#src/components/Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiSolidReceipt } from 'react-icons/bi';
import { FaCcAmex, FaCcDiscover, FaCcMastercard, FaCcVisa } from 'react-icons/fa'
import { Loader } from '#src/components';

loadStripe.setLoadParameters({ advancedFraudSignals: false });
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

export const Payment = () => {
    const { plan } = useParams();
    return (
        <Elements options={{ appearance: { theme: 'flat' } }} stripe={stripePromise}>
            <PaymentInner plan={plan} />
        </Elements>
    );
}

export const PaymentInner = ({ plan: defaultPlan }) => {
    const queryClient = useQueryClient();
    const stripe = useStripe();
    const elements = useElements();
    const darkMode = useGlobalStore(state => state.darkMode);
    const [open, setOpen] = useState(false);
    const loading = useGlobalStore(state => state.loading);
    const setLoading = useGlobalStore(state => state.setLoading);

    const { data: cards } = useQuery({
        queryKey: ["cards"],
        queryFn: async () => (await (await API.post({ apiName: 'auth', path: '/auth/listCards' }).response).body.json())
    });

    const { data: invoices } = useQuery({
        queryKey: ["invoices"],
        queryFn: async () => (await (await API.post({ apiName: 'auth', path: '/auth/listInvoices' }).response).body.json())
    });

    const addCard = async () => {
        try {
            setLoading(true);
            const addCard = await (await API.post({ apiName: "auth", path: "/stripeSetupIntent" }).response).body.json();
            const result = await stripe.confirmCardSetup(addCard.client_secret, {
                payment_method: {
                    card: elements.getElement(CardElement)!,
                },
            });
            await API.post({ apiName: "auth", path: "/setPrimary", options: { body: { payment_method_id: result.payment_method } } }).response;
            await Auth.fetchAuthSession({ forceRefresh: true });
            await queryClient.refetchQueries({ queryKey: ['cards'] });
            setOpen(false);
            setLoading(false);
        }
        catch (err) {
            console.log(err);
            setOpen(false);
            setLoading(false);
        }
    }

    const deleteCard = async (id) => {
        setLoading(true);
        try {
            await API.post({ apiName: "auth", path: "/deleteCard", options: { body: { payment_method_id: id } } }).response;
            await queryClient.refetchQueries({ queryKey: ['cards'] });
            setLoading(false);
        }
        catch (err) {
            console.log(err);
            setLoading(false);
        }
    }

    const setPrimary = async (id) => {
        setLoading(true);
        try {
            await API.post({ apiName: "auth", path: "/setPrimary", options: { body: { payment_method_id: id } } }).response;
            await Auth.fetchAuthSession({ forceRefresh: true });
            await queryClient.refetchQueries(['cards']);
            setLoading(false);
        }
        catch (err) {
            console.log(err);
            setLoading(false);
        }
    }

    return (
        <div className="max-w-screen-sm m-auto flex flex-col gap-4 bg-card p-5 sm:p-10 rounded-xl min-h-[70vh] shadow-lg">
            <div className="flex flex-col gap-4 mb-8">
                <div className='pt-4 font-bold text-lg'>Payment methods</div>
                {cards?.map((card, index) => <div key={index} className='flex flex-row justify-between items-center gap-4 pb-4'>
                    <div className='flex flex-row gap-2 justify-center items-center'>
                        {card.brand === 'visa' ? <FaCcVisa size={50} /> : null}
                        {card.brand === 'amex' ? <FaCcAmex size={50} /> : null}
                        {card.brand === 'mastercard' ? <FaCcMastercard size={50} /> : null}
                        {card.brand === 'discover' ? <FaCcDiscover size={50} /> : null}
                        <div className='text-left'>
                            <div className=''><span className='capitalize'>{card.brand}</span>{` ending in ${card.last4}`}</div>
                            <div className=''>Exp. {card.expiration}</div>
                        </div>
                    </div>
                    <div className='text-right'>
                        {card.default ? <div className='text-select'>{`Primary`}</div> : <div onClick={() => setPrimary(card.id)} className='cursor-pointer text-select hover:opacity-50'>{`Set as primary`}</div>}
                        {cards?.length > 1 ? <div onClick={() => deleteCard(card.id)} className='cursor-pointer text-red hover:opacity-50'>{`Delete card`}</div> : null}
                    </div>
                </div>) ?? <div className='h-[66px]'>
                        <Loader inner />
                    </div>}
                <button onClick={() => setOpen(true)} className="bg-primary text-white p-2 rounded-lg hover:opacity-50">Add a new card</button>

                <div className='pt-4 font-bold text-lg'>Invoices</div>
                {invoices?.map((invoice, index) => <div key={index} className='flex flex-row justify-between items-center gap-4 pb-4'>
                    <div className='w-[80%]'>
                        <div className='text-sm text-grey'>{new Date(invoice?.date).toLocaleString("en-US", {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}</div>
                        <div>{invoice?.plans}</div>
                    </div>
                    <div className='text-xl font-bold flex flex-row gap-4 items-center'>
                        <div className=''>${invoice?.amount ?? 0}</div>
                        <a className='text-select' target="_blank" href={invoice?.link}><BiSolidReceipt /></a>
                    </div>
                </div>) ?? <div className='h-[250px]'>
                        <Loader inner />
                    </div>}
            </div>
            <Modal open={open} setOpen={setOpen}>
                <div className='flex flex-col justify-between gap-4'>
                    <div className='text-xl font-bold'>Add a new card</div>
                    <div className='bg-card p-2.5 rounded-lg h-10 text-text'>
                        <CardElement options={{
                            disableLink: true,
                            hideIcon: true,
                            hidePostalCode: true,
                            style: {
                                base: {
                                    color: !darkMode ? "#000" : "#fff",
                                    fontFamily: 'arial',
                                    fontSize: "16px",
                                    "::placeholder": {
                                        color: '#999'
                                    },
                                },

                            },
                        }} />
                    </div>
                    <button disabled={loading} onClick={() => addCard()} className="bg-primary text-white p-2 rounded-lg">Add card</button>
                </div>
            </Modal>
        </div>
    )
}