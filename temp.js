exports.checkCouponCodeOnStripe = async (req, res) => {
    try {
        const { code: reqCode, planType } = req.body;

        let valid = false;
        let off = null;
        let offType = null;

        const promoCode = await stripeService.findPromotionCode(reqCode);
        if (promoCode && promoCode.coupon.applies_to.products) {
            if (planType === 'monthly' && promoCode.coupon.applies_to.products.includes(stripeConfig.products.MONTHLY_PRO_MEMBERSHIP))
                valid = true;
            else if (planType === 'lifetime' && promoCode.coupon.applies_to.products.includes(stripeConfig.products.LIFETIME_PRO_MEMBERSHIP))
                valid = true;

            if (valid) {
                if (!!promoCode.coupon.amount_off) {
                    off = promoCode.coupon.amount_off / 100;
                    offType = "fixed";
                } else {
                    off = promoCode.coupon.percent_off;
                    offType = "percent";
                }
            }
        }
        return res.send({ valid, off, offType, message: valid ? "Promo Code Applied" : "Invalid Code. Try again." });
    } catch (error) {
        console.error(error);
        return res.send({ valid: false, message: "Invalid Code. Try again." });
    }
};