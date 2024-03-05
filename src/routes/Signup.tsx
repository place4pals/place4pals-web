import { useState, useRef } from 'react';
import * as Auth from 'aws-amplify/auth';;
import { useNavigate } from 'react-router-dom';
import { loadStripe } from "@stripe/stripe-js/pure";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import * as API from 'aws-amplify/api';
import { sleep, useGlobalStore } from '#src/utils';
import { useQueryClient } from '@tanstack/react-query';
import { usePostHog } from 'posthog-js/react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css'
import flags from 'react-phone-number-input/flags'

loadStripe.setLoadParameters({ advancedFraudSignals: false });
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

export const Signup = () => {
    return (
        <Elements options={{ appearance: { theme: 'flat' } }} stripe={stripePromise}>
            <SignupInner />
        </Elements>
    );
}

export const SignupInner = () => {
    const queryClient = useQueryClient();
    const formRef = useRef(null);
    const stripe = useStripe();
    const elements = useElements();
    const setAuthenticated = useGlobalStore(state => state.setAuthenticated);
    const loading = useGlobalStore(state => state.loading);
    const setLoading = useGlobalStore(state => state.setLoading);
    const darkMode = useGlobalStore(state => state.darkMode);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const navigate = useNavigate();
    const posthog = usePostHog()

    const signup = async (e) => {
        e.preventDefault();
        const { name, email, password, terms, promo } = Object.fromEntries(new FormData(e.currentTarget));
        if (!terms) {
            alert(`You must agree to the Terms of Service and Privacy Policy`);
            return;
        }
        setLoading('Signing up...');

        // Create the customer in Stripe
        const { customer_id, client_secret } = await (await API.post({
            apiName: 'public', path: '/createStripeCustomer', options: { body: { email, name } }
        }).response).body.json();
        const confirm = await stripe.confirmCardSetup(client_secret,
            { payment_method: { card: elements.getElement(CardElement), billing_details: { name, email } } }
        );

        if (confirm.setupIntent?.payment_method) {
            try {
                await Auth.signUp({
                    username: crypto.randomUUID(),
                    password: password.toString(),
                    options: {
                        userAttributes: {
                            email: email.toString().toLowerCase(),
                            name: name.toString(),
                            profile: customer_id,
                            website: confirm.setupIntent?.payment_method.toString(),
                            ...promo && { zoneinfo: promo.toString() },
                        },
                        autoSignIn: { enabled: true }
                    }
                });
                await sleep(2000);
                await Auth.autoSignIn();
                const attributes = (await Auth.fetchAuthSession()).tokens?.idToken?.payload
                setAuthenticated(attributes?.sub);
                posthog?.identify(attributes?.sub, { email: attributes?.email });
                setLoading(false);
                queryClient.refetchQueries({ queryKey: ['user'] });
                navigate('/dashboard?new=1');
            }
            catch (err) {
                setLoading(false);
                setError(err?.message);
            }
        }
        else {
            setLoading(false);
            setError(confirm?.error?.message ?? 'Your card has been declined.');
        }
    }

    const applyPromo = async (e) => {
        e.preventDefault();
        const { promo } = Object.fromEntries(new FormData(formRef.current));
        const response = await (await API.post({
            apiName: 'public', path: '/checkPromoCode', options: { body: { promo } }
        }).response).body.json();
        if (response?.message) {
            setError(``);
            setSuccess(`Success! You're getting ${response.message}`);
        }
        else {
            setSuccess(``);
            setError(`Sorry, that promo code is invalid.`);
        }
        return;
    }

    return (<div className="w-full m-auto flex flex-col gap-4 bg-card p-5 rounded-xl">
        <form ref={formRef} onSubmit={signup} className="flex flex-col gap-4 w-full">
            <input name="name" type="text" placeholder='Full name' className="p-2 rounded-lg bg-background" />
            <input name="email" type="text" placeholder='Email address' className="p-2 rounded-lg bg-background" />
            <input name="password" type="password" placeholder='Password' className="p-2 rounded-lg bg-background" />
            <div className='relative'>
                <PhoneInput
                    international={false}
                    className="p-2 rounded-lg bg-background w-full"
                    flags={flags}
                    defaultCountry="US"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={setPhoneNumber} />
                <div className='absolute right-4 top-3 text-[#666] text-xs'>Optional</div>
            </div>
            <div className='pt-4 font-bold text-lg'>Billing information</div>
            <div className='bg-background p-2.5 rounded-lg h-10 text-text'>
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
            <div className='relative w-full'>
                <input name="promo" type="text" placeholder='Promo code' className="p-2 rounded-lg bg-background w-full" onInput={(e) => e.target.value = ("" + e.target.value).toUpperCase()} />
                <button onClick={applyPromo} onKeyDown={(e) => { e.key === 'Enter' && applyPromo }} className='absolute right-4 top-2 text-primary hover:opacity-50'>Apply code</button>
            </div>
            {success && <div className='bg-successBackground border border-successBorder p-2 rounded-xl'>{success}</div>}
            {error && <div className='bg-errorBackground border border-errorBorder p-2 rounded-lg'>{error}</div>}
            <div className='flex flex-row gap-2 items-center justify-center text-sm sm:text-base'>
                <input id="terms" name="terms" type="checkbox" className='h-5 w-5' />
                <label htmlFor="terms">
                    {`I agree to the `}
                    <a target="_blank" rel="noreferrer" href="/terms" className='underline hover:opacity-50'>
                        {`Terms of Service`}
                    </a>{` & `}
                    <a target="_blank" rel="noreferrer" href="/privacy" className='underline hover:opacity-50'>
                        {`Privacy Policy`}
                    </a>
                </label>
            </div>
            <button disabled={loading} className="bg-primary text-[white] p-2 rounded-lg hover:opacity-50">Sign up</button>
        </form>
    </div>)
}