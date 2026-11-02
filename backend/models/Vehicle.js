import prisma from '../config/prisma.js';
import { attachId, createQueryWrapper, normalizeSort } from './modelUtils.js';

class VehicleModelInstance {
    constructor(data = {}) {
        Object.assign(this, data);
        if (this.id && !this._id) {
            this._id = this.id;
        }
    }

    async save() {
        const branchIdVal = (this.branchId && typeof this.branchId === 'object')
            ? (this.branchId.id || this.branchId._id)
            : this.branchId;

        const dataToSave = {
            brand: this.brand,
            model: this.model,
            type: this.type || 'Car',
            category: this.category || null,
            registrationNumber: this.registrationNumber,
            fuelType: this.fuelType,
            transmission: this.transmission,
            seats: Number(this.seats) || 4,
            mileage: Number(this.mileage) || 15,
            features: Array.isArray(this.features) ? this.features : [],
            pricePerDay: Number(this.pricePerDay),
            pricePerHour: Number(this.pricePerHour) || 0,
            extraHourCharge: Number(this.extraHourCharge) || 0,
            depositAmount: Number(this.depositAmount),
            branchId: branchIdVal ? branchIdVal.toString() : null,
            images: Array.isArray(this.images) ? this.images : [],
            status: this.status || 'Available',
            currentOdometer: Number(this.currentOdometer) || 0,
            averageRating: Number(this.averageRating) || 0,
            numReviews: Number(this.numReviews) || 0,
        };

        if (this.id || this._id) {
            const id = this.id || this._id;
            const updated = await prisma.vehicle.update({
                where: { id: id.toString() },
                data: dataToSave,
                include: { branch: true },
            });
            Object.assign(this, updated);
            this._id = this.id;
            return this;
        } else {
            const created = await prisma.vehicle.create({
                data: dataToSave,
                include: { branch: true },
            });
            Object.assign(this, created);
            this._id = this.id;
            return this;
        }
    }

    async deleteOne() {
        const id = this.id || this._id;
        if (id) {
            await prisma.vehicle.delete({ where: { id: id.toString() } });
        }
    }
}

function parseVehicleFilter(filter = {}) {
    let where = {};

    if (filter.id || filter._id) {
        where.id = (filter.id || filter._id).toString();
    }
    if (filter.branchId) {
        where.branchId = filter.branchId.toString();
    }
    if (filter.type) {
        where.type = filter.type;
    }
    if (filter.status) {
        where.status = filter.status;
    }
    if (filter.$or && Array.isArray(filter.$or)) {
        // e.g. [{ brand: { $regex, $options } }, { model: { $regex, $options } }]
        where.OR = filter.$or.map(cond => {
            const orItem = {};
            for (const key of Object.keys(cond)) {
                if (cond[key]?.$regex) {
                    orItem[key] = { contains: cond[key].$regex, mode: 'insensitive' };
                } else if (typeof cond[key] === 'string') {
                    orItem[key] = { contains: cond[key], mode: 'insensitive' };
                }
            }
            return orItem;
        });
    }

    return where;
}

const Vehicle = function(data) {
    return new VehicleModelInstance(data);
};

Vehicle.countDocuments = async function(filter = {}) {
    const where = parseVehicleFilter(filter);
    return await prisma.vehicle.count({ where });
};

Vehicle.find = function(filter = {}) {
    return createQueryWrapper(async ({ populateOpts, limitVal, skipVal, sortVal }) => {
        const where = parseVehicleFilter(filter);

        let queryArgs = {
            where,
            include: { branch: true },
            orderBy: normalizeSort(sortVal),
        };
        if (typeof limitVal === 'number') queryArgs.take = limitVal;
        if (typeof skipVal === 'number') queryArgs.skip = skipVal;

        const vehicles = await prisma.vehicle.findMany(queryArgs);

        return vehicles.map(v => {
            const inst = new VehicleModelInstance(v);
            if (v.branch) {
                inst.branchId = {
                    id: v.branch.id,
                    _id: v.branch.id,
                    name: v.branch.name,
                    location: v.branch.location,
                };
            }
            return inst;
        });
    });
};

Vehicle.findById = function(id) {
    return createQueryWrapper(async () => {
        if (!id) return null;
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: id.toString() },
            include: { branch: true },
        });
        if (!vehicle) return null;
        const inst = new VehicleModelInstance(vehicle);
        if (vehicle.branch) {
            inst.branchId = {
                id: vehicle.branch.id,
                _id: vehicle.branch.id,
                name: vehicle.branch.name,
                location: vehicle.branch.location,
            };
        }
        return inst;
    });
};

Vehicle.findByIdAndUpdate = function(id, updateData) {
    return createQueryWrapper(async () => {
        if (!id) return null;
        const cleanData = {};
        for (const key of ['status', 'averageRating', 'numReviews', 'currentOdometer', 'pricePerDay', 'pricePerHour', 'extraHourCharge', 'depositAmount']) {
            if (updateData[key] !== undefined) {
                cleanData[key] = updateData[key];
            }
        }
        const updated = await prisma.vehicle.update({
            where: { id: id.toString() },
            data: cleanData,
            include: { branch: true },
        });
        const inst = new VehicleModelInstance(updated);
        if (updated.branch) {
            inst.branchId = {
                id: updated.branch.id,
                _id: updated.branch.id,
                name: updated.branch.name,
                location: updated.branch.location,
            };
        }
        return inst;
    });
};

Vehicle.insertMany = async function(vehicles) {
    const results = [];
    for (const item of vehicles) {
        const inst = new VehicleModelInstance(item);
        results.push(await inst.save());
    }
    return results;
};

Vehicle.deleteMany = async function() {
    return await prisma.vehicle.deleteMany({});
};

export default Vehicle;
