import prisma from '../config/prisma.js';
import { attachId, createQueryWrapper } from './modelUtils.js';

class PaymentModelInstance {
    constructor(data = {}) {
        Object.assign(this, data);
        if (this.id && !this._id) {
            this._id = this.id;
        }
    }

    async save() {
        const bookingIdVal = (this.bookingId && typeof this.bookingId === 'object')
            ? (this.bookingId.id || this.bookingId._id)
            : this.bookingId;
        const userIdVal = (this.userId && typeof this.userId === 'object')
            ? (this.userId.id || this.userId._id)
            : this.userId;

        const dataToSave = {
            bookingId: bookingIdVal ? bookingIdVal.toString() : null,
            userId: userIdVal ? userIdVal.toString() : null,
            amount: Number(this.amount),
            type: this.type,
            providerPaymentId: this.providerPaymentId || null,
            providerOrderId: this.providerOrderId || null,
            status: this.status || 'Pending',
        };

        if (this.id || this._id) {
            const id = this.id || this._id;
            const updated = await prisma.payment.update({
                where: { id: id.toString() },
                data: dataToSave,
            });
            Object.assign(this, updated);
            this._id = this.id;
            return this;
        } else {
            const created = await prisma.payment.create({
                data: dataToSave,
            });
            Object.assign(this, created);
            this._id = this.id;
            return this;
        }
    }

    async deleteOne() {
        const id = this.id || this._id;
        if (id) {
            await prisma.payment.delete({ where: { id: id.toString() } });
        }
    }
}

const Payment = function(data) {
    return new PaymentModelInstance(data);
};

Payment.findOne = async function(filter = {}) {
    let where = {};
    if (filter.providerOrderId) {
        where.providerOrderId = filter.providerOrderId;
    }
    if (filter.id || filter._id) {
        where.id = (filter.id || filter._id).toString();
    }
    const payment = await prisma.payment.findFirst({ where });
    if (!payment) return null;
    return new PaymentModelInstance(payment);
};

Payment.find = function(filter = {}) {
    return createQueryWrapper(async () => {
        let where = {};
        if (filter.bookingId?.$in) {
            where.bookingId = {
                in: filter.bookingId.$in.map(id => id.toString()),
            };
        } else if (filter.bookingId) {
            where.bookingId = filter.bookingId.toString();
        }
        const payments = await prisma.payment.findMany({ where });
        return payments.map(p => new PaymentModelInstance(p));
    });
};

Payment.deleteMany = async function() {
    return await prisma.payment.deleteMany({});
};

export default Payment;
