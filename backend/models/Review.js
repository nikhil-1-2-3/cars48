import prisma from '../config/prisma.js';
import { attachId, createQueryWrapper, normalizeSort } from './modelUtils.js';

class ReviewModelInstance {
    constructor(data = {}) {
        Object.assign(this, data);
        if (this.id && !this._id) {
            this._id = this.id;
        }
    }

    async save() {
        const userIdVal = (this.userId && typeof this.userId === 'object')
            ? (this.userId.id || this.userId._id)
            : this.userId;
        const vehicleIdVal = (this.vehicleId && typeof this.vehicleId === 'object')
            ? (this.vehicleId.id || this.vehicleId._id)
            : this.vehicleId;
        const bookingIdVal = (this.bookingId && typeof this.bookingId === 'object')
            ? (this.bookingId.id || this.bookingId._id)
            : this.bookingId;

        const dataToSave = {
            userId: userIdVal ? userIdVal.toString() : null,
            vehicleId: vehicleIdVal ? vehicleIdVal.toString() : null,
            bookingId: bookingIdVal ? bookingIdVal.toString() : null,
            rating: Number(this.rating),
            comment: this.comment || '',
        };

        if (this.id || this._id) {
            const id = this.id || this._id;
            const updated = await prisma.review.update({
                where: { id: id.toString() },
                data: dataToSave,
                include: { user: true },
            });
            Object.assign(this, updated);
            this._id = this.id;
            return this;
        } else {
            const created = await prisma.review.create({
                data: dataToSave,
                include: { user: true },
            });
            Object.assign(this, created);
            this._id = this.id;
            return this;
        }
    }

    async deleteOne() {
        const id = this.id || this._id;
        if (id) {
            await prisma.review.delete({ where: { id: id.toString() } });
        }
    }
}

function mapReview(r) {
    const inst = new ReviewModelInstance(r);
    if (r.user) {
        inst.userId = {
            id: r.user.id,
            _id: r.user.id,
            name: r.user.name,
        };
    }
    return inst;
}

const Review = function(data) {
    return new ReviewModelInstance(data);
};

Review.findOne = async function(filter = {}) {
    let where = {};
    if (filter.bookingId) {
        where.bookingId = (filter.bookingId.id || filter.bookingId._id || filter.bookingId).toString();
    }
    if (filter.userId) {
        where.userId = (filter.userId.id || filter.userId._id || filter.userId).toString();
    }
    if (filter.id || filter._id) {
        where.id = (filter.id || filter._id).toString();
    }

    const review = await prisma.review.findFirst({
        where,
        include: { user: true },
    });
    if (!review) return null;
    return mapReview(review);
};

Review.find = function(filter = {}) {
    return createQueryWrapper(async ({ sortVal }) => {
        let where = {};
        if (filter.vehicleId) {
            where.vehicleId = (filter.vehicleId.id || filter.vehicleId._id || filter.vehicleId).toString();
        }
        if (filter.userId) {
            where.userId = (filter.userId.id || filter.userId._id || filter.userId).toString();
        }

        const reviews = await prisma.review.findMany({
            where,
            include: { user: true },
            orderBy: normalizeSort(sortVal),
        });

        return reviews.map(r => mapReview(r));
    });
};

Review.findById = function(id) {
    return createQueryWrapper(async () => {
        if (!id) return null;
        const review = await prisma.review.findUnique({
            where: { id: id.toString() },
            include: { user: true },
        });
        if (!review) return null;
        return mapReview(review);
    });
};

Review.deleteMany = async function() {
    return await prisma.review.deleteMany({});
};

export default Review;
