export function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { setDefaultResultOrder } = require('node:dns');
        setDefaultResultOrder('ipv4first');
        console.log('✅ DNS forced to ipv4first');
    }
}