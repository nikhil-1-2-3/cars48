import prisma from '../config/prisma.js';
import { attachId, createQueryWrapper } from './modelUtils.js';

class RentalRecordModelInstance {
    constructor(data = {}) {
        Object.assign(this, data);
        if (this.id && !this._id) {
            this._id = this.id;
        }

        // Format pickup and return nested objects
        if (!this.pickup) {
            this.pickup = {
                date: this.pickupDate || null,
                odometer: this.pickupOdometer ?? null,
                fuelLevel: this.pickupFuelLevel || null,
                conditionNotes: this.pickupConditionNotes || null,
                handledBy: this.pickupHandledBy ? {
                    id: this.pickupHandledBy.id,
                    _id: this.pickupHandledBy.id,
                    name: this.pickupHandledBy.name,
                } : (this.pickupHandledById || null),
            };
        }
        if (!this.return) {
            this.return = {
                date: this.returnDate || null,
                odometer: this.returnOdometer ?? null,
                fuelLevel: this.returnFuelLevel || null,
                conditionNotes: this.returnConditionNotes || null,
                damageCharges: this.returnDamageCharges || 0,
                lateCharges: this.returnLateCharges || 0,
                handledBy: this.returnHandledBy ? {
                    id: this.returnHandledBy.id,
                    _id: this.returnHandledBy.id,
                    name: this.returnHandledBy.name,
                } : (this.returnHandledById || null),
            };
        }
    }

    async save() {
        const bookingIdVal = (this.bookingId && typeof this.bookingId === 'object')
            ? (this.bookingId.id || this.bookingId._id)
            : this.bookingId;

        const p = this.pickup || {};
        const r = this.return || {};

        const pickupHandledByVal = (p.handledBy && typeof p.handledBy === 'object')
            ? (p.handledBy.id || p.handledBy._id)
            : p.handledBy;

        const returnHandledByVal = (r.handledBy && typeof r.handledBy === 'object')
            ? (r.handledBy.id || r.handledBy._id)
            : r.handledBy;

        const dataToSave = {
            bookingId: bookingIdVal ? bookingIdVal.toString() : null,
            pickupDate: p.date ? new Date(p.date) : null,
            pickupOdometer: p.odometer !== undefined ? Number(p.odometer) : null,
            pickupFuelLevel: p.fuelLevel || null,
            pickupConditionNotes: p.conditionNotes || null,
            pickupHandledById: pickupHandledByVal ? pickupHandledByVal.toString() : null,
            returnDate: r.date ? new Date(r.date) : null,
            returnOdometer: r.odometer !== undefined ? Number(r.odometer) : null,
            returnFuelLevel: r.fuelLevel || null,
            returnConditionNotes: r.conditionNotes || null,
            returnDamageCharges: Number(r.damageCharges) || 0,
            returnLateCharges: Number(r.lateCharges) || 0,
            returnHandledById: returnHandledByVal ? returnHandledByVal.toString() : null,
        };

        if (this.id || this._id) {
            const id = this.id || this._id;
            const updated = await prisma.rentalRecord.update({
                where: { id: id.toString() },
                data: dataToSave,
                include: {
                    booking: { include: { customer: true, vehicle: true, branch: true } },
                    pickupHandledBy: true,
                    returnHandledBy: true,
                },
            });
            return mapRentalRecord(updated);
        } else {
            const created = await prisma.rentalRecord.create({
                data: dataToSave,
                include: {
                    booking: { include: { customer: true, vehicle: true, branch: true } },
                    pickupHandledBy: true,
                    returnHandledBy: true,
                },
            });
            return mapRentalRecord(created);
        }
    }

    async deleteOne() {
        const id = this.id || this._id;
        if (id) {
            await prisma.rentalRecord.delete({ where: { id: id.toString() } });
        }
    }
}

function mapRentalRecord(rec) {
    const inst = new RentalRecordModelInstance(rec);
    if (rec.booking) {
        inst.bookingId = {
            id: rec.booking.id,
            _id: rec.booking.id,
            startDate: rec.booking.startDate,
            endDate: rec.booking.endDate,
            totalAmount: rec.booking.totalAmount,
            depositAmount: rec.booking.depositAmount,
            status: rec.booking.status,
            customerId: rec.booking.customer ? {
                id: rec.booking.customer.id,
                _id: rec.booking.customer.id,
                name: rec.booking.customer.name,
                email: rec.booking.customer.email,
                phone: rec.booking.customer.phone,
            } : rec.booking.customerId,
            vehicleId: rec.booking.vehicle ? {
                id: rec.booking.vehicle.id,
                _id: rec.booking.vehicle.id,
                brand: rec.booking.vehicle.brand,
                model: rec.booking.vehicle.model,
                registrationNumber: rec.booking.vehicle.registrationNumber,
                branchId: rec.booking.vehicle.branchId,
                status: rec.booking.vehicle.status,
                currentOdometer: rec.booking.vehicle.currentOdometer,
            } : rec.booking.vehicleId,
        };
    }
    return inst;
}

const RentalRecord = function(data) {
    return new RentalRecordModelInstance(data);
};

RentalRecord.findOne = async function(filter = {}) {
    let where = {};
    if (filter.bookingId) {
        where.bookingId = (filter.bookingId.id || filter.bookingId._id || filter.bookingId).toString();
    }
    if (filter.id || filter._id) {
        where.id = (filter.id || filter._id).toString();
    }
    const record = await prisma.rentalRecord.findFirst({
        where,
        include: {
            booking: { include: { customer: true, vehicle: true, branch: true } },
            pickupHandledBy: true,
            returnHandledBy: true,
        },
    });
    if (!record) return null;
    return mapRentalRecord(record);
};

RentalRecord.find = function(filter = {}) {
    return createQueryWrapper(async () => {
        const records = await prisma.rentalRecord.findMany({
            include: {
                booking: { include: { customer: true, vehicle: true, branch: true } },
                pickupHandledBy: true,
                returnHandledBy: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return records.map(r => mapRentalRecord(r));
    });
};

RentalRecord.findById = function(id) {
    return createQueryWrapper(async () => {
        if (!id) return null;
        const record = await prisma.rentalRecord.findUnique({
            where: { id: id.toString() },
            include: {
                booking: { include: { customer: true, vehicle: true, branch: true } },
                pickupHandledBy: true,
                returnHandledBy: true,
            },
        });
        if (!record) return null;
        return mapRentalRecord(record);
    });
};

RentalRecord.deleteMany = async function() {
    return await prisma.rentalRecord.deleteMany({});
};

export default RentalRecord;
