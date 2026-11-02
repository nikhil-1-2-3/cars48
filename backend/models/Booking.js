import prisma from '../config/prisma.js';
import { attachId, createQueryWrapper, normalizeSort } from './modelUtils.js';

class BookingModelInstance {
    constructor(data = {}) {
        Object.assign(this, data);
        if (this.id && !this._id) {
            this._id = this.id;
        }
    }

    async save() {
        const customerIdVal = (this.customerId && typeof this.customerId === 'object')
            ? (this.customerId.id || this.customerId._id)
            : this.customerId;
        const vehicleIdVal = (this.vehicleId && typeof this.vehicleId === 'object')
            ? (this.vehicleId.id || this.vehicleId._id)
            : this.vehicleId;
        const branchIdVal = (this.branchId && typeof this.branchId === 'object')
            ? (this.branchId.id || this.branchId._id)
            : this.branchId;

        const dataToSave = {
            customerId: customerIdVal ? customerIdVal.toString() : null,
            vehicleId: vehicleIdVal ? vehicleIdVal.toString() : null,
            branchId: branchIdVal ? branchIdVal.toString() : null,
            startDate: new Date(this.startDate),
            endDate: new Date(this.endDate),
            totalAmount: Number(this.totalAmount),
            depositAmount: Number(this.depositAmount),
            status: this.status || 'Pending',
            paymentId: this.paymentId || null,
            isPaid: this.isPaid ?? false,
        };

        if (this.id || this._id) {
            const id = this.id || this._id;
            const updated = await prisma.booking.update({
                where: { id: id.toString() },
                data: dataToSave,
                include: { customer: true, vehicle: true, branch: true },
            });
            Object.assign(this, updated);
            this._id = this.id;
            return this;
        } else {
            const created = await prisma.booking.create({
                data: dataToSave,
                include: { customer: true, vehicle: true, branch: true },
            });
            Object.assign(this, created);
            this._id = this.id;
            return this;
        }
    }

    async deleteOne() {
        const id = this.id || this._id;
        if (id) {
            await prisma.booking.delete({ where: { id: id.toString() } });
        }
    }
}

function mapBookingInstance(b) {
    const inst = new BookingModelInstance(b);
    if (b.customer) {
        inst.customerId = {
            id: b.customer.id,
            _id: b.customer.id,
            name: b.customer.name,
            email: b.customer.email,
            phone: b.customer.phone,
        };
    }
    if (b.vehicle) {
        inst.vehicleId = {
            id: b.vehicle.id,
            _id: b.vehicle.id,
            brand: b.vehicle.brand,
            model: b.vehicle.model,
            images: b.vehicle.images,
            registrationNumber: b.vehicle.registrationNumber,
            branchId: b.vehicle.branchId,
        };
    }
    if (b.branch) {
        inst.branchId = {
            id: b.branch.id,
            _id: b.branch.id,
            name: b.branch.name,
            location: b.branch.location,
        };
    }
    return inst;
}

const Booking = function(data) {
    return new BookingModelInstance(data);
};

Booking.findOne = async function(filter = {}) {
    let where = {};
    if (filter.id || filter._id) {
        where.id = (filter.id || filter._id).toString();
    }
    if (filter.vehicleId) {
        where.vehicleId = filter.vehicleId.toString();
    }
    if (filter.status?.$nin) {
        where.status = { notIn: filter.status.$nin };
    }
    if (filter.$and && Array.isArray(filter.$and)) {
        // e.g. [{ startDate: { $lt: requestedEnd } }, { endDate: { $gt: requestedStart } }]
        const conditions = [];
        for (const item of filter.$and) {
            if (item.startDate?.$lt) {
                conditions.push({ startDate: { lt: new Date(item.startDate.$lt) } });
            }
            if (item.endDate?.$gt) {
                conditions.push({ endDate: { gt: new Date(item.endDate.$gt) } });
            }
        }
        if (conditions.length > 0) {
            where.AND = conditions;
        }
    }

    const booking = await prisma.booking.findFirst({
        where,
        include: { customer: true, vehicle: true, branch: true },
    });
    if (!booking) return null;
    return mapBookingInstance(booking);
};

Booking.find = function(filter = {}) {
    return createQueryWrapper(async ({ sortVal }) => {
        let where = {};
        if (filter.customerId) {
            where.customerId = (filter.customerId.id || filter.customerId._id || filter.customerId).toString();
        }
        if (filter.branchId) {
            where.branchId = (filter.branchId.id || filter.branchId._id || filter.branchId).toString();
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: { customer: true, vehicle: true, branch: true },
            orderBy: normalizeSort(sortVal),
        });

        return bookings.map(b => mapBookingInstance(b));
    });
};

Booking.findById = function(id) {
    return createQueryWrapper(async () => {
        if (!id) return null;
        const booking = await prisma.booking.findUnique({
            where: { id: id.toString() },
            include: { customer: true, vehicle: true, branch: true },
        });
        if (!booking) return null;
        return mapBookingInstance(booking);
    });
};

Booking.findByIdAndUpdate = function(id, updateData) {
    return createQueryWrapper(async () => {
        if (!id) return null;
        const cleanData = {};
        for (const key of ['status', 'isPaid', 'paymentId']) {
            if (updateData[key] !== undefined) {
                cleanData[key] = updateData[key];
            }
        }
        const updated = await prisma.booking.update({
            where: { id: id.toString() },
            data: cleanData,
            include: { customer: true, vehicle: true, branch: true },
        });
        return mapBookingInstance(updated);
    });
};

Booking.deleteMany = async function() {
    return await prisma.booking.deleteMany({});
};

export default Booking;
