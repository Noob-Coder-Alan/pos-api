import { Resolver, Query, Arg, Mutation, Authorized, Ctx } from "type-graphql";
import { OrderInput } from "../inputs/OrderInput";
import { Order } from "../models/Order";
import { Product } from "../models/Product";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { Variant } from "../models/Variant";
import { Context } from "../types/context";
require('dotenv').config()

@Resolver(() => Transaction)
export class TransactionResolver {
    @Authorized()
    @Query(() => Transaction, { nullable: true })
    async getTransaction(@Ctx() ctx: Context, @Arg("id") id: number) {
        const user = await User.findOne(ctx.currentUser.id);
        const transaction = await Transaction.findOne({ where: { id: id, owner: user} });
        return transaction;
    }

    @Authorized()
    @Query(() => [Transaction], { nullable: true })
    async getTransactions(@Ctx() ctx: Context) {
        const user = await User.findOne(ctx.currentUser.id);
        const transactions = await Transaction.find({ where: { owner: user } });
        return transactions;
    }


    @Authorized()
    @Mutation(() => Transaction, { nullable: true })
    async createTransaction(@Ctx() ctx: Context, @Arg("orders") orders: OrderInput) {
        try {
            const user = await User.findOne(ctx.currentUser.id);

            if (!user) throw Error("Unauthorized interaction.");

            let orderList =  []

            for (let index = 0; index < orders.productIds.length; index++) {
                const product = await Product.findOne({ where: { id: orders.productIds[index], user: user } });

                const variant = await Variant.findOne({ where: { variantId: orders.variantIds[index], product: product } });

                // console.log(product && variant && orders.quantity[index] > 0 )
                // console.log(product && variant && orders.quantity[index] <= variant.quantity )
                // console.log(variant!.quantity,'V', orders.quantity[index], 'O')
                // console.log(product && variant && orders.quantity[index] > 0  && orders.quantity[index] <= variant.quantity)
                if (product && variant && orders.quantity[index] > 0 && orders.quantity[index]<= variant.quantity) {
                    variant.quantity -= orders.quantity[index];
                    await variant.save();

                    let newOrder = await Order.create({
                        product: product,
                        variant: variant,
                        quantity: orders.quantity[index],
                    }).save();

                    orderList.push(newOrder);
                }

            }

            if (orderList) {
                const transaction = await Transaction.create({
                    owner: user,
                    orders: orderList
                }).save()
    
                return transaction;
            }

            return null;
     
        } catch (error) {
            throw Error(error);
        }
    }
}